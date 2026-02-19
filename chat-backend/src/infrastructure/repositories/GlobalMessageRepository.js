const db = require('../database/postgres');

class GlobalMessageRepository {
  
  // Crear la tabla si no existe
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
      console.log('✅ Global messages table ready');
    } catch (error) {
      console.error('Error ensuring global_messages table:', error);
    }
  }

  // Crear un nuevo mensaje global
  async create({ userId, content }) {
    const result = await db.query(
      `INSERT INTO global_messages (user_id, content) 
       VALUES ($1, $2) 
       RETURNING id, user_id, content, created_at`,
      [userId, content]
    );
    
    // Obtener info del usuario
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

  // Obtener los últimos N mensajes globales
  async getRecent(limit = 100) {
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
       ORDER BY gm.created_at ASC
       LIMIT $1`,
      [limit]
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

  // Limpiar mensajes antiguos (más de X días)
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
