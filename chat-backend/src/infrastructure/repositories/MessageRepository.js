const db = require('../database/postgres');

class MessageRepository {
  async findById(id) {
    const result = await db.query(
      `SELECT m.*, u.role as sender_role, u.name as sender_name
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [id]
    );
    return this._mapMessage(result.rows[0]);
  }

  async findByExternalMessageId(externalMessageId) {
    const result = await db.query(
      `SELECT m.*, u.role as sender_role, u.name as sender_name
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.external_message_id = $1
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [externalMessageId]
    );
    return this._mapMessage(result.rows[0]);
  }

  async findByChatId(chatId) {
    const result = await db.query(
      `SELECT m.*, u.role as sender_role, u.name as sender_name,
              reply.content as reply_to_content,
              reply_user.role as reply_to_sender_role
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN messages reply ON m.reply_to_id = reply.id
       LEFT JOIN users reply_user ON reply.user_id = reply_user.id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC`,
      [chatId]
    );
    return result.rows.map(row => this._mapMessage(row));
  }

  async create({ chatId, userId, content, senderRole, replyToId, channel, externalMessageId, status }) {
    // Get user name for the sender
    const userResult = await db.query(
      `SELECT name FROM users WHERE id = $1`,
      [userId]
    );
    const senderName = userResult.rows[0]?.name || null;
    
    const result = await db.query(
      `INSERT INTO messages (chat_id, user_id, content, reply_to_id, status, channel, external_message_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        chatId,
        userId,
        content,
        replyToId || null,
        status || 'sent',
        channel || 'web',
        externalMessageId || null
      ]
    );
    
    // If there's a reply, get the replied message content
    let replyToContent = null;
    let replyToSenderRole = null;
    if (replyToId) {
      const replyMsg = await this.findById(replyToId);
      if (replyMsg) {
        replyToContent = replyMsg.content;
        replyToSenderRole = replyMsg.senderRole;
      }
    }
    
    // Return with sender info and reply info
    return {
      ...this._mapMessage(result.rows[0]),
      senderRole: senderRole,
      senderName: senderName,
      status: status || 'sent',
      replyToContent,
      replyToSenderRole
    };
  }

  async markAsRead(messageId) {
    const result = await db.query(
      `UPDATE messages SET is_read = true WHERE id = $1 RETURNING *`,
      [messageId]
    );
    return this._mapMessage(result.rows[0]);
  }

  async markAllAsReadInChat(chatId, userId) {
    // Mark all messages from other users as read
    await db.query(
      `UPDATE messages 
       SET is_read = true 
       WHERE chat_id = $1 AND user_id != $2 AND is_read = false`,
      [chatId, userId]
    );
  }

  async getUnreadCount(chatId, userId) {
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE chat_id = $1 AND user_id != $2 AND is_read = false`,
      [chatId, userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async updateStatus(messageId, status) {
    const result = await db.query(
      `UPDATE messages SET status = $1 WHERE id = $2 RETURNING *`,
      [status, messageId]
    );
    return this._mapMessage(result.rows[0]);
  }

  async updateExternalMessageId(messageId, externalMessageId) {
    const result = await db.query(
      `UPDATE messages SET external_message_id = $1 WHERE id = $2 RETURNING *`,
      [externalMessageId, messageId]
    );
    return this._mapMessage(result.rows[0]);
  }

  async markAsDelivered(messageIds) {
    if (!messageIds || messageIds.length === 0) return [];
    const result = await db.query(
      `UPDATE messages SET status = 'delivered' 
       WHERE id = ANY($1) AND status = 'sent' 
       RETURNING *`,
      [messageIds]
    );
    return result.rows.map(row => this._mapMessage(row));
  }

  async markAsReadWithStatus(chatId, userId) {
    // Mark messages as read and update status
    const result = await db.query(
      `UPDATE messages 
       SET is_read = true, status = 'read' 
       WHERE chat_id = $1 AND user_id != $2 AND is_read = false
       RETURNING *`,
      [chatId, userId]
    );
    return result.rows.map(row => this._mapMessage(row));
  }

  _mapMessage(row) {
    if (!row) return null;
    
    return {
      id: row.id,
      chatId: row.chat_id,
      userId: row.user_id,
      content: row.content,
      senderRole: row.sender_role,
      senderName: row.sender_name || null,
      replyToId: row.reply_to_id || null,
      replyToContent: row.reply_to_content || null,
      replyToSenderRole: row.reply_to_sender_role || null,
      isRead: row.is_read,
      status: row.status || 'sent',
      channel: row.channel || 'web',
      externalMessageId: row.external_message_id || null,
      timestamp: row.created_at,
      createdAt: row.created_at
    };
  }
}

module.exports = new MessageRepository();
