const db = require('../database/postgres');

class MessageRepository {
  /** @param {number} id - Identificador del mensaje. @returns {Promise<Object|null>} Mensaje encontrado. */
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

  /**
   * Busca un mensaje por el identificador entregado por WhatsApp.
   * @param {string} externalMessageId - Identificador externo.
   * @param {number} whatsappConnectionId - Conexión que recibió el evento.
   * @returns {Promise<Object|null>} Mensaje encontrado.
   * @throws {Error} Si no se especifica la conexión.
   */
  async findByExternalMessageId(externalMessageId, whatsappConnectionId) {
    if (!whatsappConnectionId) throw new Error('whatsappConnectionId is required');
    const result = await db.query(
      `SELECT m.*, u.role as sender_role, u.name as sender_name
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.external_message_id = $1 AND m.whatsapp_connection_id = $2
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [externalMessageId, whatsappConnectionId]
    );
    return this._mapMessage(result.rows[0]);
  }

  /** @param {number} chatId - Conversación consultada. @returns {Promise<Object[]>} Mensajes cronológicos. */
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

  /**
   * Crea un mensaje y valida que cualquier respuesta pertenezca al mismo chat.
   * @param {Object} data - Contenido, autor, canal y metadatos del mensaje.
   * @returns {Promise<Object>} Mensaje creado.
   * @throws {Error} Si el mensaje respondido no pertenece a la conversación.
   */
  async create({ chatId, userId, content, senderRole, replyToId, channel, externalMessageId, whatsappConnectionId, status }) {
    let replyToContent = null;
    let replyToSenderRole = null;

    if (replyToId) {
      const replyResult = await db.query(
        `SELECT m.content, u.role AS sender_role
         FROM messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.id = $1 AND m.chat_id = $2`,
        [replyToId, chatId]
      );

      if (!replyResult.rows[0]) {
        throw new Error('El mensaje respondido no pertenece a este chat');
      }

      replyToContent = replyResult.rows[0].content;
      replyToSenderRole = replyResult.rows[0].sender_role;
    }

    // Obtiene el nombre del autor para construir la respuesta del repositorio.
    const userResult = await db.query(
      `SELECT name FROM users WHERE id = $1`,
      [userId]
    );
    const senderName = userResult.rows[0]?.name || null;
    
    const result = await db.query(
      `INSERT INTO messages (chat_id, user_id, content, reply_to_id, status, channel, external_message_id, whatsapp_connection_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        chatId,
        userId,
        content,
        replyToId || null,
        status || 'sent',
        channel || 'web',
        externalMessageId || null,
        whatsappConnectionId || null
      ]
    );
    
    // Combina la fila creada con los datos del autor y del mensaje citado.
    return {
      ...this._mapMessage(result.rows[0]),
      senderRole: senderRole,
      senderName: senderName,
      status: status || 'sent',
      replyToContent,
      replyToSenderRole
    };
  }

  /** @param {number} messageId - Mensaje leído. @returns {Promise<Object|null>} Mensaje actualizado. */
  async markAsRead(messageId) {
    const result = await db.query(
      `UPDATE messages SET is_read = true WHERE id = $1 RETURNING *`,
      [messageId]
    );
    return this._mapMessage(result.rows[0]);
  }

  /**
   * Marca como leídos los mensajes escritos por otros usuarios en un chat.
   * @param {number} chatId - Conversación consultada.
   * @param {number} userId - Usuario que realizó la lectura.
   * @returns {Promise<void>}
   */
  async markAllAsReadInChat(chatId, userId) {
    await db.query(
      `UPDATE messages 
       SET is_read = true 
       WHERE chat_id = $1 AND user_id != $2 AND is_read = false`,
      [chatId, userId]
    );
  }

  /**
   * Cuenta los mensajes pendientes para un usuario.
   * @param {number} chatId - Conversación consultada.
   * @param {number} userId - Usuario destinatario.
   * @returns {Promise<number>} Cantidad pendiente.
   */
  async getUnreadCount(chatId, userId) {
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM messages 
       WHERE chat_id = $1 AND user_id != $2 AND is_read = false`,
      [chatId, userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Avanza el estado de entrega de un mensaje sin permitir retrocesos.
   * @param {number} messageId - Mensaje actualizado.
   * @param {string} status - Nuevo estado.
   * @returns {Promise<Object|null>} Mensaje actualizado.
   */
  async updateStatus(messageId, status) {
    const result = await db.query(
      `UPDATE messages
       SET status = $1
       WHERE id = $2
         AND CASE $1
           WHEN 'sent' THEN status = 'sent'
           WHEN 'delivered' THEN status IN ('sent', 'delivered')
           WHEN 'read' THEN status IN ('sent', 'delivered', 'read')
           WHEN 'failed' THEN status IN ('sent', 'failed')
           ELSE false
         END
       RETURNING *`,
      [status, messageId]
    );
    return this._mapMessage(result.rows[0]);
  }

  /**
   * Asocia un mensaje local con su identificador de WhatsApp.
   * @param {number} messageId - Mensaje local.
   * @param {string} externalMessageId - Identificador de Meta.
   * @param {number} whatsappConnectionId - Conexión utilizada.
   * @returns {Promise<Object|null>} Mensaje actualizado.
   */
  async updateExternalMessageId(messageId, externalMessageId, whatsappConnectionId) {
    if (!whatsappConnectionId) throw new Error('whatsappConnectionId is required');
    const result = await db.query(
      `UPDATE messages SET external_message_id = $1, whatsapp_connection_id = $2 WHERE id = $3 RETURNING *`,
      [externalMessageId, whatsappConnectionId, messageId]
    );
    return this._mapMessage(result.rows[0]);
  }

  /** @param {number[]} messageIds - Mensajes confirmados. @returns {Promise<Object[]>} Mensajes actualizados. */
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

  /**
   * Marca como leídos y actualiza el estado de los mensajes de otros usuarios.
   * @param {number} chatId - Conversación consultada.
   * @param {number} userId - Usuario que realizó la lectura.
   * @returns {Promise<Object[]>} Mensajes actualizados.
   */
  async markAsReadWithStatus(chatId, userId) {
    const result = await db.query(
      `UPDATE messages 
       SET is_read = true, status = 'read' 
       WHERE chat_id = $1 AND user_id != $2 AND is_read = false
       RETURNING *`,
      [chatId, userId]
    );
    return result.rows.map(row => this._mapMessage(row));
  }

  /** @param {Object} row - Fila de PostgreSQL. @returns {Object|null} Mensaje normalizado. */
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
      whatsappConnectionId: row.whatsapp_connection_id || null,
      timestamp: row.created_at,
      createdAt: row.created_at
    };
  }
}

module.exports = new MessageRepository();
