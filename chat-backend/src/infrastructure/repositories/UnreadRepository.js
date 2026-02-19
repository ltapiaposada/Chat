const db = require('../database/postgres');

class UnreadRepository {
  async markDmRead({ userId, otherAgentId }) {
    const min = Math.min(Number(userId), Number(otherAgentId));
    const max = Math.max(Number(userId), Number(otherAgentId));
    await db.query(
      `INSERT INTO user_dm_reads (user_id, agent_a, agent_b, last_read_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, agent_a, agent_b)
       DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
      [userId, min, max]
    );
  }

  async markGroupRead({ userId, groupId }) {
    await db.query(
      `INSERT INTO user_group_reads (user_id, group_id, last_read_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, group_id)
       DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
      [userId, groupId]
    );
  }

  async markGlobalRead({ userId }) {
    await db.query(
      `INSERT INTO user_global_reads (user_id, last_read_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
      [userId]
    );
  }

  async getDmUnreadCounts(userId) {
    const result = await db.query(
      `
      WITH threads AS (
        SELECT agent_a, agent_b
        FROM agent_dm_messages
        WHERE agent_a = $1 OR agent_b = $1
        GROUP BY agent_a, agent_b
      )
      SELECT
        t.agent_a,
        t.agent_b,
        COUNT(m.id) AS unread
      FROM threads t
      JOIN agent_dm_messages m
        ON m.agent_a = t.agent_a AND m.agent_b = t.agent_b
       AND m.user_id <> $1
      LEFT JOIN user_dm_reads r
        ON r.user_id = $1 AND r.agent_a = t.agent_a AND r.agent_b = t.agent_b
      WHERE m.created_at > COALESCE(r.last_read_at, '1970-01-01')
      GROUP BY t.agent_a, t.agent_b
      `,
      [userId]
    );

    return result.rows.map((row) => ({
      agentA: row.agent_a,
      agentB: row.agent_b,
      unread: Number(row.unread || 0)
    }));
  }

  async getGroupUnreadCounts(userId) {
    const result = await db.query(
      `
      SELECT
        gm.group_id,
        COUNT(gm.id) AS unread
      FROM group_members mem
      JOIN group_messages gm
        ON gm.group_id = mem.group_id
       AND gm.user_id <> $1
      LEFT JOIN user_group_reads r
        ON r.user_id = $1 AND r.group_id = mem.group_id
      WHERE mem.user_id = $1
        AND gm.created_at > COALESCE(r.last_read_at, '1970-01-01')
      GROUP BY gm.group_id
      `,
      [userId]
    );

    return result.rows.map((row) => ({
      groupId: row.group_id,
      unread: Number(row.unread || 0)
    }));
  }

  async getGlobalUnreadCount(userId) {
    const result = await db.query(
      `
      SELECT COUNT(*) AS unread
      FROM global_messages gm
      LEFT JOIN user_global_reads r
        ON r.user_id = $1
      WHERE gm.user_id <> $1
        AND gm.created_at > COALESCE(r.last_read_at, '1970-01-01')
      `,
      [userId]
    );
    return Number(result.rows?.[0]?.unread || 0);
  }
}

module.exports = new UnreadRepository();
