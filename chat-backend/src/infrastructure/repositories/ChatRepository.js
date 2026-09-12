const db = require('../database/postgres');

function requireTenant(companyId) {
  const value = Number(companyId);
  if (!Number.isInteger(value) || value <= 0) throw new Error('companyId is required');
  return value;
}

class ChatRepository {
  async findById(id, companyId) {
    const tenantId = requireTenant(companyId);
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM messages m JOIN users u ON m.user_id = u.id
               WHERE m.chat_id = c.id AND u.role = 'client' AND m.is_read = false)::int AS unread_count
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.id = $1 AND c.company_id = $2`, [id, tenantId]
    );
    return this._mapChat(result.rows[0]);
  }

  async findByClientId(clientId, companyId) {
    const tenantId = requireTenant(companyId);
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.client_id = $1 AND c.company_id = $2 ORDER BY c.created_at DESC`, [clientId, tenantId]
    );
    return result.rows.map((row) => this._mapChat(row));
  }

  async findByAgentId(agentId, companyId) {
    const tenantId = requireTenant(companyId);
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.agent_id = $1 AND c.company_id = $2 ORDER BY c.created_at DESC`, [agentId, tenantId]
    );
    return result.rows.map((row) => this._mapChat(row));
  }

  async findByStatus(status, companyId) {
    const tenantId = requireTenant(companyId);
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.status = $1 AND c.company_id = $2 ORDER BY c.created_at ASC`, [status, tenantId]
    );
    return result.rows.map((row) => this._mapChat(row));
  }

  async findPending(companyId, channelIds, departmentIds = [], companyWide = false) {
    const tenantId = requireTenant(companyId);
    if (!Array.isArray(channelIds) || channelIds.length === 0) return [];
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
              (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM messages m JOIN users u ON m.user_id = u.id
               WHERE m.chat_id = c.id AND u.role = 'client' AND m.is_read = false)::int AS unread_count
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.status = 'pending' AND c.company_id = $1 AND c.channel_id = ANY($2::int[])
         AND ($4::boolean OR c.department_id IS NULL OR c.department_id = ANY($3::int[]))
       ORDER BY c.created_at ASC`,
      [tenantId, channelIds, departmentIds, companyWide]
    );
    return result.rows.map((row) => this._mapChat(row));
  }

  async findActiveByAgentId(agentId, companyId) {
    const tenantId = requireTenant(companyId);
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM messages m JOIN users u ON m.user_id = u.id
         WHERE m.chat_id = c.id AND u.role = 'client' AND m.is_read = false)::int AS unread_count
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.agent_id = $1 AND c.company_id = $2 AND c.status IN ('active', 'on_hold')
       ORDER BY c.created_at DESC`, [agentId, tenantId]
    );
    return result.rows.map((row) => this._mapChat(row));
  }

  async create({ clientId, companyId, channelId, subject, channel, departmentId = null,
    intention = null, agentId = null }) {
    const tenantId = requireTenant(companyId);
    const scopedChannelId = Number(channelId);
    if (!Number.isInteger(scopedChannelId) || scopedChannelId <= 0) throw new Error('channelId is required');
    const result = await db.query(
      `INSERT INTO chats (client_id, company_id, channel_id, subject, status, channel,
                          department_id, intention, agent_id, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               CASE WHEN $9::integer IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END) RETURNING id`,
      [clientId, tenantId, scopedChannelId, subject || 'Soporte', agentId ? 'active' : 'pending',
        channel || 'web', departmentId, intention, agentId]
    );
    return this.findById(result.rows[0].id, tenantId);
  }

  async assignToAgent(chatId, agentId, companyId, channelIds) {
    const tenantId = requireTenant(companyId);
    if (!Array.isArray(channelIds) || channelIds.length === 0) return null;
    const result = await db.query(
      `UPDATE chats SET agent_id = $1, status = 'active', assigned_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND company_id = $3 AND channel_id = ANY($4::int[])
         AND status = 'pending' AND agent_id IS NULL
       RETURNING id`, [agentId, chatId, tenantId, channelIds]
    );
    if (!result.rows[0]) return null;
    return this.findById(chatId, tenantId);
  }

  async updateStatus(chatId, status, companyId) {
    const tenantId = requireTenant(companyId);
    await db.query(
      status === 'closed'
        ? `UPDATE chats SET status = $1, closed_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3`
        : `UPDATE chats SET status = $1 WHERE id = $2 AND company_id = $3`,
      [status, chatId, tenantId]
    );
    return this.findById(chatId, tenantId);
  }

  async findActiveByClientIdAndChannel(clientId, channel, companyId, channelId) {
    const tenantId = requireTenant(companyId);
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE c.client_id = $1 AND c.channel = $2 AND c.company_id = $3 AND c.channel_id = $4
         AND c.status IN ('pending', 'active', 'on_hold') ORDER BY c.created_at DESC LIMIT 1`,
      [clientId, channel, tenantId, channelId]
    );
    return this._mapChat(result.rows[0]);
  }

  async transferToAgent(chatId, newAgentId, companyId) {
    const tenantId = requireTenant(companyId);
    await db.query(
      `UPDATE chats SET agent_id = $1, assigned_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND company_id = $3
         AND EXISTS (
           SELECT 1 FROM agent_channels ac
           WHERE ac.agent_id = $1 AND ac.channel_id = chats.channel_id AND ac.company_id = $3
         )`,
      [newAgentId, chatId, tenantId]
    );
    return this.findById(chatId, tenantId);
  }

  async setFirstResponseTime(chatId, companyId) {
    const tenantId = requireTenant(companyId);
    await db.query(
      `UPDATE chats SET first_response_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2 AND first_response_at IS NULL`, [chatId, tenantId]
    );
    return this.findById(chatId, tenantId);
  }

  async touchCustomerMessage(chatId, companyId) {
    const tenantId = requireTenant(companyId);
    await db.query(
      `UPDATE chats SET last_customer_message_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND company_id=$2`,
      [chatId, tenantId]
    );
  }

  async submitSurvey(chatId, rating, feedback, companyId) {
    const tenantId = requireTenant(companyId);
    await db.query(
      `UPDATE chats SET rating = $1, feedback = $2 WHERE id = $3 AND company_id = $4`,
      [rating, feedback, chatId, tenantId]
    );
    return this.findById(chatId, tenantId);
  }

  async findClosedByAgentId(agentId, companyId, companyWide = false) {
    const tenantId = requireTenant(companyId);
    const result = await db.query(
      `SELECT c.*, (SELECT name FROM channels WHERE id=c.channel_id AND company_id=c.company_id) AS channel_name,
              (SELECT name FROM departments WHERE id=c.department_id AND company_id=c.company_id) AS department_name,
              client.name AS client_name, agent.name AS agent_name,
        EXTRACT(EPOCH FROM (c.first_response_at - c.assigned_at))::int AS first_response_seconds,
        EXTRACT(EPOCH FROM (c.closed_at - c.created_at))::int AS duration_seconds
       FROM chats c LEFT JOIN users client ON c.client_id = client.id
       LEFT JOIN users agent ON c.agent_id = agent.id
       WHERE (c.agent_id = $1 OR $3::boolean) AND c.company_id = $2 AND c.status = 'closed'
       ORDER BY c.closed_at DESC`, [agentId, tenantId, companyWide]
    );
    return result.rows.map((row) => this._mapChatWithMetrics(row));
  }

  _mapChatWithMetrics(row) {
    const chat = this._mapChat(row);
    if (chat) { chat.firstResponseSeconds = row.first_response_seconds; chat.durationSeconds = row.duration_seconds; }
    return chat;
  }

  _mapChat(row) {
    if (!row) return null;
    return {
      id: row.id, companyId: row.company_id, channelId: row.channel_id,
      departmentId: row.department_id || null, departmentName: row.department_name || null,
      intention: row.intention || null,
      clientId: row.client_id, clientName: row.client_name,
      agentId: row.agent_id, agentName: row.agent_name, status: row.status,
      channel: row.channel || 'web', channelName: row.channel_name || null,
      subject: row.subject, createdAt: row.created_at,
      assignedAt: row.assigned_at, closedAt: row.closed_at,
      firstResponseAt: row.first_response_at, updatedAt: row.updated_at,
      lastCustomerMessageAt: row.last_customer_message_at,
      lastMessage: row.last_message || null, unreadCount: row.unread_count || 0,
      rating: row.rating || null, feedback: row.feedback || null
    };
  }
}

module.exports = new ChatRepository();
