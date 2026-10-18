const db = require('../database/postgres');

class DepartmentRepository {
  /**
   * Lista los departamentos disponibles para un canal empresarial.
   * @param {number} companyId - Identificador de la empresa.
   * @param {number} channelId - Identificador del canal.
   * @returns {Promise<Object[]>} Departamentos activos.
   */
  async listForChannel(companyId, channelId) {
    const result = await db.query(
      `SELECT d.id, d.name, d.slug
       FROM departments d JOIN department_channels dc ON dc.department_id=d.id AND dc.company_id=d.company_id
       WHERE d.company_id=$1 AND dc.channel_id=$2 AND d.status='active' ORDER BY d.name`,
      [companyId, channelId]
    );
    return result.rows;
  }

  /**
   * Busca un departamento activo y asociado al canal indicado.
   * @param {number} id - Identificador del departamento.
   * @param {number} companyId - Identificador de la empresa.
   * @param {number} channelId - Identificador del canal.
   * @returns {Promise<Object|null>} Departamento encontrado.
   */
  async findAvailable(id, companyId, channelId) {
    const result = await db.query(
      `SELECT d.* FROM departments d
       JOIN department_channels dc ON dc.department_id=d.id AND dc.company_id=d.company_id
       WHERE d.id=$1 AND d.company_id=$2 AND dc.channel_id=$3 AND d.status='active'`,
      [id, companyId, channelId]
    );
    return result.rows[0] || null;
  }

  /**
   * Lista los departamentos asignados a un agente.
   * @param {number} agentId - Identificador del agente.
   * @param {number} companyId - Identificador de la empresa.
   * @returns {Promise<number[]>} Identificadores de departamentos.
   */
  async findAgentDepartmentIds(agentId, companyId) {
    const result = await db.query(
      `SELECT department_id FROM agent_departments WHERE agent_id=$1 AND company_id=$2`,
      [agentId, companyId]
    );
    return result.rows.map((row) => Number(row.department_id));
  }

  /**
   * Selecciona el siguiente agente disponible de un departamento y canal.
   * @param {Object} department - Departamento con su estrategia de asignación.
   * @param {number} channelId - Canal que recibirá la conversación.
   * @returns {Promise<Object|null>} Agente seleccionado o `null`.
   */
  async selectAgent(department, channelId) {
    if (!department || department.routing_strategy === 'broadcast') return null;
    if (department.routing_strategy === 'direct') {
      if (!department.default_agent_id) return null;
      const direct = await db.query(
        `SELECT u.id, u.name FROM users u
         JOIN agent_departments ad ON ad.agent_id=u.id AND ad.company_id=u.company_id
         JOIN agent_channels ac ON ac.agent_id=u.id AND ac.company_id=u.company_id
         WHERE u.id=$1 AND u.company_id=$2 AND ad.department_id=$3 AND ac.channel_id=$4`,
        [department.default_agent_id, department.company_id, department.id, channelId]
      );
      return direct.rows[0] || null;
    }
    const result = await db.query(
      `SELECT u.id, u.name, COUNT(c.id)::int AS active_chats
       FROM users u
       JOIN agent_departments ad ON ad.agent_id=u.id AND ad.company_id=u.company_id
       JOIN agent_channels ac ON ac.agent_id=u.id AND ac.company_id=u.company_id
       LEFT JOIN chats c ON c.agent_id=u.id AND c.company_id=u.company_id AND c.status IN ('active','on_hold')
       WHERE ad.department_id=$1 AND ad.company_id=$2 AND ac.channel_id=$3 AND u.is_online=true
       GROUP BY u.id ORDER BY active_chats ASC, u.id ASC LIMIT 1`,
      [department.id, department.company_id, channelId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new DepartmentRepository();
