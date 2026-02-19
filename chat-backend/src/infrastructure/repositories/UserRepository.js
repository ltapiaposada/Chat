const db = require('../database/postgres');

class UserRepository {
  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findByRole(role) {
    const result = await db.query('SELECT * FROM users WHERE role = $1', [role]);
    return result.rows;
  }

  async findByWhatsAppId(whatsappId) {
    const result = await db.query('SELECT * FROM users WHERE whatsapp_id = $1', [whatsappId]);
    return result.rows[0] || null;
  }

  async findOnlineAgents() {
    const result = await db.query(
      'SELECT * FROM users WHERE role = $1 AND is_online = true',
      ['agent']
    );
    return result.rows;
  }

  async create({ name, email, role, whatsappId }) {
    const result = await db.query(
      `INSERT INTO users (name, email, role, whatsapp_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, email || null, role, whatsappId || null]
    );
    return result.rows[0];
  }

  async findOrCreate({ id, name, role, whatsappId }) {
    // Try to find existing user by id
    if (id) {
      const existing = await this.findById(id);
      if (existing) {
        return existing;
      }
    }

    if (whatsappId) {
      const existingByWhatsapp = await this.findByWhatsAppId(whatsappId);
      if (existingByWhatsapp) {
        return existingByWhatsapp;
      }
    }

    // Create new user
    const result = await db.query(
      `INSERT INTO users (name, role, whatsapp_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, role, whatsappId || null]
    );
    return result.rows[0];
  }

  async updateOnlineStatus(id, isOnline) {
    const result = await db.query(
      `UPDATE users SET is_online = $1 WHERE id = $2 RETURNING *`,
      [isOnline, id]
    );
    return result.rows[0];
  }

  async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.isOnline !== undefined) {
      fields.push(`is_online = $${paramCount++}`);
      values.push(data.isOnline);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

module.exports = new UserRepository();
