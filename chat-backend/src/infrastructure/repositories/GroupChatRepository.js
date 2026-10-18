const db = require('../database/postgres');

class GroupChatRepository {
  /**
   * Crea un grupo y registra sus integrantes en una transacción.
   * @param {Object} data - Nombre, creador y miembros iniciales.
   * @returns {Promise<Object>} Grupo creado.
   * @throws {Error} Si la transacción no puede completarse.
   */
  async create({ name, createdBy, memberIds = [] }) {
    const result = await db.query(
      `INSERT INTO group_chats (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_by, created_at`,
      [name, createdBy]
    );

    const group = result.rows[0];
    const uniqueMemberIds = Array.from(new Set([createdBy, ...memberIds]));
    if (uniqueMemberIds.length > 0) {
      const values = uniqueMemberIds
        .map((_, index) => `($1, $${index + 3}, $2)`)
        .join(', ');
      const params = [group.id, createdBy, ...uniqueMemberIds];
      await db.query(
        `INSERT INTO group_members (group_id, user_id, added_by)
         VALUES ${values}
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        params
      );
    }

    return {
      id: group.id,
      name: group.name,
      createdBy: group.created_by,
      createdAt: group.created_at
    };
  }

  /**
   * Agrega integrantes a un grupo y evita asignaciones duplicadas.
   * @param {Object} data - Grupo, miembros y agente que realiza la acción.
   * @returns {Promise<Object[]>} Integrantes agregados.
   */
  async addMembers({ groupId, memberIds = [], addedBy }) {
    const uniqueMemberIds = Array.from(new Set(memberIds));
    if (uniqueMemberIds.length === 0) return 0;
    const values = uniqueMemberIds
      .map((_, index) => `($1, $${index + 3}, $2)`)
      .join(', ');
    const params = [groupId, addedBy, ...uniqueMemberIds];
    const result = await db.query(
      `INSERT INTO group_members (group_id, user_id, added_by)
       VALUES ${values}
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      params
    );
    return result.rowCount || 0;
  }

  /**
   * Lista los grupos a los que pertenece un usuario.
   * @param {number} userId - Identificador del usuario.
   * @returns {Promise<Object[]>} Grupos visibles.
   */
  async listForUser(userId) {
    const result = await db.query(
      `SELECT g.id, g.name, g.created_by, g.created_at,
              gm.user_id, u.name AS user_name
       FROM group_chats g
       JOIN group_members gm ON gm.group_id = g.id
       JOIN users u ON u.id = gm.user_id
       WHERE g.id IN (
         SELECT group_id FROM group_members WHERE user_id = $1
       )
       ORDER BY g.created_at DESC`,
      [userId]
    );

    const byGroup = new Map();
    result.rows.forEach((row) => {
      if (!byGroup.has(row.id)) {
        byGroup.set(row.id, {
          id: row.id,
          name: row.name,
          createdBy: row.created_by,
          createdAt: row.created_at,
          members: []
        });
      }
      byGroup.get(row.id).members.push({
        id: row.user_id,
        name: row.user_name
      });
    });

    return Array.from(byGroup.values());
  }

  /**
   * Lista los integrantes de un grupo.
   * @param {number} groupId - Identificador del grupo.
   * @returns {Promise<Object[]>} Usuarios integrantes.
   */
  async getMembers(groupId) {
    const result = await db.query(
      `SELECT u.id, u.name
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY u.name ASC`,
      [groupId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name
    }));
  }

  /**
   * Comprueba la pertenencia de un usuario a un grupo.
   * @param {number} groupId - Identificador del grupo.
   * @param {number} userId - Identificador del usuario.
   * @returns {Promise<boolean>} Resultado de pertenencia.
   */
  async isMember(groupId, userId) {
    const result = await db.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Busca un grupo por su identificador.
   * @param {number} groupId - Identificador del grupo.
   * @returns {Promise<Object|null>} Grupo encontrado.
   */
  async getById(groupId) {
    const result = await db.query(
      `SELECT id, name, created_by, created_at
       FROM group_chats
       WHERE id = $1`,
      [groupId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  /**
   * Retira un integrante de un grupo.
   * @param {Object} data - Grupo e integrante que se desea retirar.
   * @returns {Promise<Object|null>} Asignación eliminada.
   */
  async removeMember({ groupId, memberId }) {
    const result = await db.query(
      `DELETE FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, memberId]
    );
    return result.rowCount || 0;
  }
}

module.exports = new GroupChatRepository();
