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

  async findByRole(role, companyId) {
    if (!companyId) throw new Error('companyId is required');
    const result = await db.query('SELECT * FROM users WHERE role = $1 AND company_id = $2', [role, companyId]);
    return result.rows;
  }

  async findByWhatsAppId(whatsappId, companyId, channelId) {
    if (!companyId || !channelId) throw new Error('companyId and channelId are required');
    const result = await db.query(
      'SELECT * FROM users WHERE whatsapp_id = $1 AND company_id = $2 AND channel_id = $3',
      [whatsappId, companyId, channelId]
    );
    return result.rows[0] || null;
  }

  async findOnlineAgents() {
    const result = await db.query(
      'SELECT * FROM users WHERE role = $1 AND is_online = true',
      ['agent']
    );
    return result.rows;
  }

  async create({ name, email, role, whatsappId, companyId = null, channelId = null }) {
    if (!companyId) throw new Error('companyId is required to create a user');
    const result = await db.query(
      `INSERT INTO users (name, email, role, whatsapp_id, company_id, channel_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email || null, role, whatsappId || null, companyId, channelId]
    );
    return result.rows[0];
  }

  async findOrCreateWhatsApp({ name, whatsappId, companyId, channelId }) {
    if (!whatsappId || !companyId || !channelId) {
      throw new Error('whatsappId, companyId and channelId are required');
    }
    const result = await db.query(
      `INSERT INTO users (name, role, whatsapp_id, company_id, channel_id)
       VALUES ($1, 'client', $2, $3, $4)
       ON CONFLICT (company_id, channel_id, whatsapp_id)
         WHERE whatsapp_id IS NOT NULL
       DO UPDATE SET
         name = EXCLUDED.name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name, whatsappId, companyId, channelId]
    );
    return result.rows[0];
  }

  async findOrCreate({ id, name, role, whatsappId, companyId = null, channelId = null }) {
    // Try to find existing user by id
    if (id) {
      const existing = await this.findById(id);
      if (existing) {
        return existing;
      }
    }

    if (whatsappId) {
      const existingByWhatsapp = await this.findByWhatsAppId(whatsappId, companyId, channelId);
      if (existingByWhatsapp) {
        return existingByWhatsapp;
      }
    }

    if (!companyId) throw new Error('companyId is required to create a user');

    // Create new user
    const result = await db.query(
      `INSERT INTO users (name, role, whatsapp_id, company_id, channel_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, role, whatsappId || null, companyId, channelId]
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
