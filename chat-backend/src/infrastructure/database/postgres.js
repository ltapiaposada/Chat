const { Pool } = require('pg');
const dbConfig = require('../../config/database');

class PostgresDatabase {
  constructor() {
    this.pool = new Pool(dbConfig);
    
    // Test connection on initialization
    this.pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async close() {
    await this.pool.end();
    console.log('Database pool closed');
  }
}

// Export a singleton instance
module.exports = new PostgresDatabase();
