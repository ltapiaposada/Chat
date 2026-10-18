const db = require('../database/postgres');

class AgentChannelRepository {
  /**
   * Lista los canales asignados a un agente dentro de su empresa.
   * @param {number} agentId - Identificador del agente.
   * @param {number} companyId - Identificador de la empresa.
   * @returns {Promise<number[]>} Identificadores de canales.
   */
  async findChannelIds(agentId, companyId) {
    const result = await db.query(
      `SELECT channel_id FROM agent_channels
       WHERE agent_id = $1 AND company_id = $2
       ORDER BY channel_id`,
      [agentId, companyId]
    );
    return result.rows.map((row) => Number(row.channel_id));
  }

  /**
   * Comprueba si un agente está asignado a un canal de su empresa.
   * @param {number} agentId - Identificador del agente.
   * @param {number} channelId - Identificador del canal.
   * @param {number} companyId - Identificador de la empresa.
   * @returns {Promise<boolean>} Resultado de la asignación.
   */
  async hasChannel(agentId, channelId, companyId) {
    const result = await db.query(
      `SELECT 1 FROM agent_channels
       WHERE agent_id = $1 AND channel_id = $2 AND company_id = $3`,
      [agentId, channelId, companyId]
    );
    return result.rowCount > 0;
  }

  /**
   * Lista todos los canales activos de una empresa.
   * @param {number} companyId - Identificador de la empresa.
   * @returns {Promise<number[]>} Identificadores de canales.
   */
  async findCompanyChannelIds(companyId) {
    const result = await db.query(
      `SELECT id FROM channels WHERE company_id = $1 AND status = 'active' ORDER BY id`,
      [companyId]
    );
    return result.rows.map((row) => Number(row.id));
  }

  /**
   * Lista los agentes habilitados para atender un canal.
   * @param {number} channelId - Identificador del canal.
   * @param {number} companyId - Identificador de la empresa.
   * @returns {Promise<Object[]>} Agentes asignados.
   */
  async findAgentsForChannel(channelId, companyId) {
    const result = await db.query(
      `SELECT u.* FROM users u
       JOIN agent_channels ac ON ac.agent_id = u.id AND ac.company_id = u.company_id
       WHERE ac.channel_id = $1 AND ac.company_id = $2
         AND u.role::text IN ('agent', 'supervisor', 'admin')
       ORDER BY u.name`,
      [channelId, companyId]
    );
    return result.rows;
  }

  /**
   * Agrupa los agentes habilitados para una colección de canales.
   * @param {number[]} channelIds - Canales consultados.
   * @param {number} companyId - Identificador de la empresa.
   * @returns {Promise<Object[]>} Asignaciones encontradas.
   */
  async findAgentsForChannels(channelIds, companyId) {
    if (!Array.isArray(channelIds) || channelIds.length === 0) return [];
    const result = await db.query(
      `SELECT DISTINCT u.* FROM users u
       JOIN agent_channels ac ON ac.agent_id = u.id AND ac.company_id = u.company_id
       WHERE ac.channel_id = ANY($1::int[]) AND ac.company_id = $2
         AND u.role::text IN ('agent', 'supervisor', 'admin')
       ORDER BY u.name`,
      [channelIds, companyId]
    );
    return result.rows;
  }
}

module.exports = new AgentChannelRepository();
