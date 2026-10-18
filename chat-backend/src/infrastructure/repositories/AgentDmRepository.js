const db = require('../database/postgres');

class AgentDmRepository {
  /**
   * Guarda un mensaje directo entre dos agentes.
   * @param {Object} data - Participantes, autor y contenido.
   * @returns {Promise<Object>} Mensaje directo creado.
   */
  async create({ agentA, agentB, userId, content }) {
    const result = await db.query(
      `INSERT INTO agent_dm_messages (agent_a, agent_b, user_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, agent_a, agent_b, user_id, content, created_at`,
      [agentA, agentB, userId, content]
    );

    const message = result.rows[0];
    const userResult = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    return {
      id: message.id,
      threadId: this.getThreadId(agentA, agentB),
      senderId: message.user_id,
      senderName: user?.name || 'Agente',
      content: message.content,
      timestamp: message.created_at
    };
  }

  /**
   * Obtiene los mensajes recientes de una conversación directa.
   * @param {Object} options - Participantes y límite de resultados.
   * @returns {Promise<Object[]>} Mensajes ordenados cronológicamente.
   */
  async getRecent({ agentA, agentB, limit = 200 }) {
    const result = await db.query(
      `SELECT
         m.id,
         m.user_id as sender_id,
         u.name as sender_name,
         m.content,
         m.created_at as timestamp
       FROM agent_dm_messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.agent_a = $1 AND m.agent_b = $2
       ORDER BY m.created_at ASC
       LIMIT $3`,
      [agentA, agentB, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      threadId: this.getThreadId(agentA, agentB),
      senderId: row.sender_id,
      senderName: row.sender_name || 'Agente',
      content: row.content,
      timestamp: row.timestamp
    }));
  }

  /**
   * Construye un identificador estable para una conversación entre dos agentes.
   * @param {number} agentA - Primer agente.
   * @param {number} agentB - Segundo agente.
   * @returns {string} Identificador de la sala Socket.IO.
   */
  getThreadId(agentA, agentB) {
    const min = Math.min(Number(agentA), Number(agentB));
    const max = Math.max(Number(agentA), Number(agentB));
    return `dm:${min}-${max}`;
  }
}

module.exports = new AgentDmRepository();
