const db = require('../database/postgres');

class ChatRepository {
  async findById(id) {
    const result = await db.query(
      `SELECT c.*, 
              client.name as client_name,
              agent.name as agent_name
       FROM chats c
       LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.id = $1`,
      [id]
    );
    return this._mapChat(result.rows[0]);
  }

  async findByClientId(clientId) {
    const result = await db.query(
      `SELECT c.*, 
              client.name as client_name,
              agent.name as agent_name,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chats c
       LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.client_id = $1
       ORDER BY c.created_at DESC`,
      [clientId]
    );
    return result.rows.map(row => this._mapChat(row));
  }

  async findByAgentId(agentId) {
    const result = await db.query(
      `SELECT c.*, 
              client.name as client_name,
              agent.name as agent_name
       FROM chats c
       LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.agent_id = $1
       ORDER BY c.created_at DESC`,
      [agentId]
    );
    return result.rows.map(row => this._mapChat(row));
  }

  async findByStatus(status) {
    const result = await db.query(
      `SELECT c.*, 
              client.name as client_name,
              agent.name as agent_name
       FROM chats c
       LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.status = $1
       ORDER BY c.created_at ASC`,
      [status]
    );
    return result.rows.map(row => this._mapChat(row));
  }

  async findPending() {
    return this.findByStatus('pending');
  }

  async findActiveByAgentId(agentId) {
    const result = await db.query(
      `SELECT c.*, 
              client.name as client_name,
              agent.name as agent_name,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT COUNT(*) FROM messages m 
               JOIN users u ON m.user_id = u.id 
               WHERE m.chat_id = c.id AND u.role = 'client' AND m.is_read = false)::int as unread_count
       FROM chats c
       LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.agent_id = $1 AND c.status IN ('active', 'on_hold')
       ORDER BY c.created_at DESC`,
      [agentId]
    );
    return result.rows.map(row => this._mapChat(row));
  }

  async create({ clientId, subject, channel }) {
    const result = await db.query(
      `INSERT INTO chats (client_id, subject, status, channel) 
       VALUES ($1, $2, 'pending', $3) 
       RETURNING *`,
      [clientId, subject || 'Soporte', channel || 'web']
    );
    
    // Fetch with joined data
    return this.findById(result.rows[0].id);
  }

  async assignToAgent(chatId, agentId) {
    const result = await db.query(
      `UPDATE chats 
       SET agent_id = $1, status = 'active', assigned_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [agentId, chatId]
    );
    return this.findById(chatId);
  }

  async updateStatus(chatId, status) {
    const updates = { status };
    
    if (status === 'closed') {
      await db.query(
        `UPDATE chats SET status = $1, closed_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [status, chatId]
      );
    } else {
      await db.query(
        `UPDATE chats SET status = $1 WHERE id = $2`,
        [status, chatId]
      );
    }
    
    return this.findById(chatId);
  }

  async findActiveByClientIdAndChannel(clientId, channel) {
    const result = await db.query(
      `SELECT c.*, 
              client.name as client_name,
              agent.name as agent_name,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chats c
       LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.client_id = $1 AND c.channel = $2 AND c.status IN ('pending', 'active', 'on_hold')
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [clientId, channel]
    );
    return this._mapChat(result.rows[0]);
  }

  async transferToAgent(chatId, newAgentId) {
    await db.query(
      `UPDATE chats SET agent_id = $1, assigned_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newAgentId, chatId]
    );
    return this.findById(chatId);
  }

  async getLastMessage(chatId) {
    const result = await db.query(
      `SELECT content FROM messages 
       WHERE chat_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [chatId]
    );
    return result.rows[0]?.content || null;
  }

  async setFirstResponseTime(chatId) {
    // Only set if not already set
    await db.query(
      `UPDATE chats 
       SET first_response_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND first_response_at IS NULL`,
      [chatId]
    );
    return this.findById(chatId);
  }

  async submitSurvey(chatId, rating, feedback) {
    await db.query(
      `UPDATE chats SET rating = $1, feedback = $2 WHERE id = $3`,
      [rating, feedback, chatId]
    );
    return this.findById(chatId);
  }

  async findClosedByAgentId(agentId) {
    const result = await db.query(
      `SELECT c.*, 
              client.name as client_name,
              agent.name as agent_name,
              EXTRACT(EPOCH FROM (c.first_response_at - c.assigned_at))::int as first_response_seconds,
              EXTRACT(EPOCH FROM (c.closed_at - c.created_at))::int as duration_seconds
       FROM chats c
       LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.agent_id = $1 AND c.status = 'closed'
       ORDER BY c.closed_at DESC
       LIMIT 100`,
      [agentId]
    );
    return result.rows.map(row => this._mapChatWithMetrics(row));
  }

  _mapChatWithMetrics(row) {
    const chat = this._mapChat(row);
    if (chat) {
      chat.firstResponseSeconds = row.first_response_seconds;
      chat.durationSeconds = row.duration_seconds;
    }
    return chat;
  }

  _mapChat(row) {
    if (!row) return null;
    
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      agentId: row.agent_id,
      agentName: row.agent_name,
      status: row.status,
      channel: row.channel || 'web',
      subject: row.subject,
      createdAt: row.created_at,
      assignedAt: row.assigned_at,
      closedAt: row.closed_at,
      firstResponseAt: row.first_response_at,
      updatedAt: row.updated_at,
      lastMessage: row.last_message || null,
      unreadCount: row.unread_count || 0,
      rating: row.rating || null,
      feedback: row.feedback || null
    };
  }
}

module.exports = new ChatRepository();
