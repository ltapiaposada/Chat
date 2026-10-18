const db = require('../database/postgres');

class GroupMessageRepository {
  /**
   * Guarda un mensaje enviado a un grupo.
   * @param {Object} data - Grupo, autor y contenido.
   * @returns {Promise<Object>} Mensaje creado.
   */
  async create({ groupId, userId, content }) {
    const result = await db.query(
      `INSERT INTO group_messages (group_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, group_id, user_id, content, created_at`,
      [groupId, userId, content]
    );

    const message = result.rows[0];
    const userResult = await db.query(
      'SELECT name, role FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    return {
      id: message.id,
      groupId: message.group_id,
      senderId: message.user_id,
      senderName: user?.name || 'Usuario',
      senderRole: user?.role || 'agent',
      content: message.content,
      timestamp: message.created_at
    };
  }

  /**
   * Obtiene los mensajes recientes de un grupo.
   * @param {number} groupId - Identificador del grupo.
   * @param {number} [limit=100] - Cantidad máxima de mensajes.
   * @returns {Promise<Object[]>} Mensajes ordenados cronológicamente.
   */
  async getRecent(groupId, limit = 100) {
    const result = await db.query(
      `SELECT gm.id, gm.group_id, gm.user_id AS sender_id,
              u.name AS sender_name, u.role AS sender_role,
              gm.content, gm.created_at AS timestamp
       FROM group_messages gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.created_at ASC
       LIMIT $2`,
      [groupId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      content: row.content,
      timestamp: row.timestamp
    }));
  }
}

module.exports = new GroupMessageRepository();
