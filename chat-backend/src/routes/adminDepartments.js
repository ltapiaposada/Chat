const { requireRole } = require('../plugins/auth');

const STRATEGIES = new Set(['broadcast', 'least_busy', 'direct']);
const FALLBACKS = new Set(['channel_queue', 'department_queue']);

/**
 * Normaliza un valor para uso como slug: minúsculas y sin espacios extra.
 * @param {string} value - Valor a normalizar.
 * @returns {string} Slug normalizado en minúsculas.
 */
function slug(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Registra una entrada en el log de auditoría de administración.
 * @param {Object} db - Conexión a la base de datos.
 * @param {Object} auth - Información de autenticación del usuario.
 * @param {number} departmentId - ID del departamento afectado.
 * @param {string} action - Nombre de la acción auditada.
 * @param {Object} [metadata={}] - Metadatos adicionales de la acción.
 * @returns {Promise<void>}
 */
async function audit(db, auth, departmentId, action, metadata = {}) {
  await db.query(
    `INSERT INTO admin_audit_logs (company_id, actor_id, action, metadata)
     VALUES ($1,$2,$3,$4::jsonb)`,
    [auth.companyId, auth.userId, action, JSON.stringify({ departmentId, ...metadata })]
  );
}

/**
 * Registra las rutas de administración de departamentos.
 * Incluye CRUD y asignación de agentes/canales a departamentos.
 * Requiere rol 'admin' en todas las rutas.
 * @param {Object} fastify - Instancia de Fastify.
 * @param {Object} options - Opciones del plugin, incluye la conexión db.
 * @returns {Promise<void>}
 */
module.exports = async function adminDepartmentRoutes(fastify, options) {
  const db = options.db;
  const adminOnly = requireRole('admin');

  // GET /api/admin/departments — Lista todos los departamentos de la empresa con canales y agentes asignados. Rol: admin.
  fastify.get('/api/admin/departments', { preHandler: adminOnly }, async (request) => {
    const result = await db.query(
      `SELECT d.*,
        COALESCE(array_agg(DISTINCT dc.channel_id) FILTER (WHERE dc.channel_id IS NOT NULL), '{}') channel_ids,
        COALESCE(array_agg(DISTINCT ad.agent_id) FILTER (WHERE ad.agent_id IS NOT NULL), '{}') agent_ids
       FROM departments d
       LEFT JOIN department_channels dc ON dc.department_id=d.id AND dc.company_id=d.company_id
       LEFT JOIN agent_departments ad ON ad.department_id=d.id AND ad.company_id=d.company_id
       WHERE d.company_id=$1 AND d.deleted_at IS NULL GROUP BY d.id ORDER BY d.name`,
      [request.auth.companyId]
    );
    return result.rows.map((row) => ({
      id: row.id, name: row.name, slug: row.slug, status: row.status,
      routingStrategy: row.routing_strategy, fallbackStrategy: row.fallback_strategy,
      defaultAgentId: row.default_agent_id, channelIds: row.channel_ids.map(Number),
      agentIds: row.agent_ids.map(Number), createdAt: row.created_at, updatedAt: row.updated_at
    }));
  });

  // POST /api/admin/departments — Crea un departamento con estrategia de enrutamiento y fallback. Efectos: registro de auditoría. Rol: admin.
  fastify.post('/api/admin/departments', { preHandler: adminOnly }, async (request, reply) => {
    const body = request.body || {};
    const name = String(body.name || '').trim();
    const normalizedSlug = slug(body.slug);
    const strategy = body.routingStrategy || 'broadcast';
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return reply.status(400).send({ error: 'Nombre y slug válido son requeridos' });
    }
    if (!STRATEGIES.has(strategy)) return reply.status(400).send({ error: 'Estrategia inválida' });
    try {
      const result = await db.query(
        `INSERT INTO departments (company_id,name,slug,routing_strategy,fallback_strategy)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [request.auth.companyId, name, normalizedSlug, strategy, body.fallbackStrategy || 'channel_queue']
      );
      await audit(db, request.auth, result.rows[0].id, 'department.created', { name, strategy });
      return reply.status(201).send({ id: result.rows[0].id });
    } catch (error) {
      if (error.code === '23505') return reply.status(409).send({ error: 'El slug ya existe' });
      throw error;
    }
  });

  // PATCH /api/admin/departments/:id — Actualiza nombre, estrategias, agente por defecto o estado de un departamento. Efectos: registro de auditoría. Rol: admin.
  fastify.patch('/api/admin/departments/:id', { preHandler: adminOnly }, async (request, reply) => {
    const id = Number(request.params.id);
    const body = request.body || {};
    if (body.routingStrategy && !STRATEGIES.has(body.routingStrategy)) {
      return reply.status(400).send({ error: 'Estrategia inválida' });
    }
    if (body.fallbackStrategy && !FALLBACKS.has(body.fallbackStrategy)) {
      return reply.status(400).send({ error: 'Fallback inválido' });
    }
    if (body.status && !['active', 'disabled'].includes(body.status)) {
      return reply.status(400).send({ error: 'Estado inválido' });
    }
    const result = await db.query(
      `UPDATE departments SET name=COALESCE($1,name), routing_strategy=COALESCE($2,routing_strategy),
       fallback_strategy=COALESCE($3,fallback_strategy),
       default_agent_id=CASE WHEN $8::boolean THEN $4 ELSE default_agent_id END,
       status=COALESCE($5,status), updated_at=CURRENT_TIMESTAMP
       WHERE id=$6 AND company_id=$7 AND deleted_at IS NULL RETURNING id`,
      [body.name ? String(body.name).trim() : null, body.routingStrategy || null,
        body.fallbackStrategy || null, body.defaultAgentId || null, body.status || null,
        id, request.auth.companyId, Object.prototype.hasOwnProperty.call(body, 'defaultAgentId')]
    );
    if (!result.rows[0]) return reply.status(404).send({ error: 'Departamento no encontrado' });
    await audit(db, request.auth, id, 'department.updated', { fields: Object.keys(body) });
    return { id };
  });

  // DELETE /api/admin/departments/:id — Elimina lógicamente un departamento, desactivándolo y cambiando su slug. Efectos: registro de auditoría. Rol: admin.
  fastify.delete('/api/admin/departments/:id', { preHandler: adminOnly }, async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) return reply.status(400).send({ error: 'Departamento inválido' });
    const result = await db.query(
      `UPDATE departments
       SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP,
           slug = LEFT(slug, 70) || '-deleted-' || id, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id, name`,
      [id, request.auth.companyId]
    );
    if (!result.rows[0]) return reply.status(404).send({ error: 'Departamento no encontrado' });
    await audit(db, request.auth, id, 'department.deleted', { name: result.rows[0].name });
    return reply.status(204).send();
  });

  // PUT /api/admin/departments/:id/assignments — Reemplaza las asignaciones de agentes y canales de un departamento. Efectos: registro de auditoría. Rol: admin.
  fastify.put('/api/admin/departments/:id/assignments', { preHandler: adminOnly }, async (request, reply) => {
    const id = Number(request.params.id);
    const agentIds = [...new Set((request.body?.agentIds || []).map(Number))];
    const channelIds = [...new Set((request.body?.channelIds || []).map(Number))];
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const department = await client.query(
        'SELECT id FROM departments WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE',
        [id, request.auth.companyId]
      );
      if (!department.rows[0]) { await client.query('ROLLBACK'); return reply.status(404).send({ error: 'Departamento no encontrado' }); }
      const validAgents = agentIds.length ? await client.query(
        `SELECT id FROM users WHERE company_id=$1 AND id=ANY($2::int[]) AND role::text IN ('agent','supervisor','admin')`,
        [request.auth.companyId, agentIds]
      ) : { rowCount: 0 };
      const validChannels = channelIds.length ? await client.query(
        `SELECT id FROM channels WHERE company_id=$1 AND deleted_at IS NULL AND id=ANY($2::int[])`,
        [request.auth.companyId, channelIds]
      ) : { rowCount: 0 };
      if (validAgents.rowCount !== agentIds.length || validChannels.rowCount !== channelIds.length) {
        await client.query('ROLLBACK');
        return reply.status(400).send({ error: 'Asignaciones inválidas para esta empresa' });
      }
      await client.query('DELETE FROM agent_departments WHERE department_id=$1 AND company_id=$2', [id, request.auth.companyId]);
      await client.query('DELETE FROM department_channels WHERE department_id=$1 AND company_id=$2', [id, request.auth.companyId]);
      if (agentIds.length) await client.query(
        `INSERT INTO agent_departments(agent_id,department_id,company_id) SELECT unnest($1::int[]),$2,$3`,
        [agentIds, id, request.auth.companyId]
      );
      if (channelIds.length) await client.query(
        `INSERT INTO department_channels(department_id,channel_id,company_id) SELECT $2,unnest($1::int[]),$3`,
        [channelIds, id, request.auth.companyId]
      );
      await client.query('COMMIT');
      await audit(db, request.auth, id, 'department.assignments_updated', { agentIds, channelIds });
      return { id, agentIds, channelIds };
    } catch (error) {
      await client.query('ROLLBACK'); throw error;
    } finally { client.release(); }
  });
};
