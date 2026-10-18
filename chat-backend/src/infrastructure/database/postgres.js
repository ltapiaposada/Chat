const { Pool } = require('pg');
const dbConfig = require('../../config/database');

class PostgresDatabase {
  /**
   * Crea el pool de PostgreSQL y registra los eventos globales de conexión.
   */
  constructor() {
    this.pool = new Pool(dbConfig);
    this.shouldLogQueries =
      String(process.env.DB_LOG_QUERIES || '').toLowerCase() === 'true' &&
      String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
    
    // Registra conexiones nuevas y detiene el proceso ante errores inesperados del pool.
    this.pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  /**
   * Ejecuta una consulta SQL mediante el pool compartido.
   *
   * @param {string} text - Sentencia SQL parametrizada.
   * @param {Array<*>} [params] - Valores asociados a los parámetros.
   * @returns {Promise<import('pg').QueryResult>} Resultado entregado por PostgreSQL.
   * @throws {Error} Si PostgreSQL rechaza o no puede ejecutar la consulta.
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      if (this.shouldLogQueries) {
        console.log('Executed query', { text, duration, rows: res.rowCount });
      }
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Reserva un cliente del pool para operaciones transaccionales.
   *
   * @returns {Promise<import('pg').PoolClient>} Cliente que debe ser liberado por quien lo solicita.
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Cierra todas las conexiones del pool.
   *
   * @returns {Promise<void>}
   */
  async close() {
    await this.pool.end();
    console.log('Database pool closed');
  }
}

// Comparte una única instancia del pool en todo el proceso.
module.exports = new PostgresDatabase();
