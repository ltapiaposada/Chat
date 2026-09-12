const db = require('../database/postgres');

class AgentChannelRepository {
  async findChannelIds(agentId, companyId) {
    const result = await db.query(
      `SELECT channel_id FROM agent_channels
       WHERE agent_id = $1 AND company_id = $2
       ORDER BY channel_id`,
      [agentId, companyId]
    );
    return result.rows.map((row) => Number(row.channel_id));
  }

  async hasChannel(agentId, channelId, companyId) {
    const result = await db.query(
      `SELECT 1 FROM agent_channels
       WHERE agent_id = $1 AND channel_id = $2 AND company_id = $3`,
      [agentId, channelId, companyId]
    );
    return result.rowCount > 0;
  }

  async findCompanyChannelIds(companyId) {
    const result = await db.query(
      `SELECT id FROM channels WHERE company_id = $1 AND status = 'active' ORDER BY id`,
      [companyId]
    );
    return result.rows.map((row) => Number(row.id));
  }

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
