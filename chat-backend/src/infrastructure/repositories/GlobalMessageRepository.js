const db = require('../database/postgres');

class GlobalMessageRepository {

  /**
   * Garantiza la existencia de la tabla e índice del chat global.
   * @returns {Promise<void>}
   */
  async ensureTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS global_messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_global_messages_created_at 
        ON global_messages(created_at DESC)
      `);
      console.log('Global messages table ready');
    } catch (error) {
      console.error('Error ensuring global_messages table:', error);
    }
  }

  /**
   * Guarda un mensaje global y completa los datos públicos de su autor.
   * @param {Object} data - Autor y contenido del mensaje.
   * @returns {Promise<Object>} Mensaje normalizado.
   */
  async create({ userId, content }) {
    const result = await db.query(
      `INSERT INTO global_messages (user_id, content) 
       VALUES ($1, $2) 
       RETURNING id, user_id, content, created_at`,
      [userId, content]
    );
    
    // Obtiene la información visible del autor.
    const userResult = await db.query(
      'SELECT name, role FROM users WHERE id = $1',
      [userId]
    );
    
    const message = result.rows[0];
    const user = userResult.rows[0];
    
    return {
      id: message.id,
      senderId: message.user_id,
      senderName: user?.name || 'Usuario',
      senderRole: user?.role || 'agent',
      content: message.content,
      timestamp: message.created_at
    };
  }

  /**
   * Obtiene los mensajes globales recientes de una empresa.
   * @param {number} [limit=100] - Cantidad máxima de mensajes.
   * @param {number|null} [companyId=null] - Empresa utilizada para aislar resultados.
   * @returns {Promise<Object[]>} Mensajes cronológicos.
   */
  async getRecent(limit = 100, companyId = null) {
    const result = await db.query(
      `SELECT 
        gm.id, 
        gm.user_id as sender_id, 
        u.name as sender_name, 
        u.role as sender_role,
        gm.content, 
        gm.created_at as timestamp
       FROM global_messages gm
       JOIN users u ON gm.user_id = u.id
       WHERE ($2::int IS NULL OR u.company_id = $2)
       ORDER BY gm.created_at ASC
       LIMIT $1`,
      [limit, companyId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      content: row.content,
      timestamp: row.timestamp
    }));
  }

  /**
   * Elimina mensajes globales anteriores al periodo de retención.
   * @param {number} [daysToKeep=30] - Días que deben conservarse.
   * @returns {Promise<number>} Cantidad de mensajes eliminados.
   */
  async cleanOldMessages(daysToKeep = 30) {
    const result = await db.query(
      `DELETE FROM global_messages 
       WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
       RETURNING id`
    );
    return result.rowCount;
  }
}

module.exports = new GlobalMessageRepository();
