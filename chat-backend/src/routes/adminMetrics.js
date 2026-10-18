const { requireRole } = require('../plugins/auth');

/**
 * Registra las rutas de métricas de administración.
 * Proporciona estadísticas de chats, canales, departamentos y agentes por rango de fechas.
 * Requiere rol 'admin' o 'supervisor'.
 * @param {Object} fastify - Instancia de Fastify.
 * @param {Object} options - Opciones del plugin, incluye la conexión db.
 * @returns {Promise<void>}
 */
module.exports = async function adminMetricsRoutes(fastify, options) {
  const db = options.db;
  const managers = requireRole(['admin', 'supervisor']);

  // GET /api/admin/metrics — Obtiene métricas consolidadas de chats, canales, departamentos y agentes para un rango de fechas. Rol: admin o supervisor.
  fastify.get('/api/admin/metrics', { preHandler: managers }, async (request, reply) => {
    const companyId = request.auth.companyId;
    const now = new Date();
    const from = request.query.from ? new Date(request.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const until = request.query.until ? new Date(request.query.until) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(until.getTime()) || from >= until) {
      return reply.status(400).send({ error: 'Selecciona un rango de fechas válido.' });
    }
    const params = [companyId, from.toISOString(), until.toISOString()];
    const [summary, channels, departments, agents] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int total_chats,
          COUNT(*) FILTER (WHERE status='pending')::int pending_chats,
          COUNT(*) FILTER (WHERE status IN ('active','on_hold'))::int active_chats,
          COUNT(*) FILTER (WHERE status='closed')::int closed_chats,
          ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at-assigned_at))) FILTER (WHERE first_response_at IS NOT NULL))::int avg_first_response_seconds,
          ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL),2) avg_rating
         FROM chats WHERE company_id=$1 AND created_at >= $2::timestamptz AND created_at < $3::timestamptz`, params
      ),
      db.query(
        `SELECT c.id, c.name, c.type, COUNT(ch.id)::int total_chats,
          COUNT(ch.id) FILTER (WHERE ch.status='pending')::int pending_chats,
          MAX(ch.created_at) last_activity_at
         FROM channels c LEFT JOIN chats ch ON ch.channel_id=c.id AND ch.company_id=c.company_id
           AND ch.created_at >= $2::timestamptz AND ch.created_at < $3::timestamptz
         WHERE c.company_id=$1 AND c.deleted_at IS NULL GROUP BY c.id ORDER BY c.name`, params
      ),
      db.query(
        `SELECT d.id, d.name, COUNT(DISTINCT ch.id)::int total_chats,
          COUNT(DISTINCT ch.id) FILTER (WHERE ch.status='pending')::int pending_chats,
          COUNT(DISTINCT ad.agent_id)::int assigned_agents
         FROM departments d
         LEFT JOIN chats ch ON ch.department_id=d.id AND ch.company_id=d.company_id
           AND ch.created_at >= $2::timestamptz AND ch.created_at < $3::timestamptz
         LEFT JOIN agent_departments ad ON ad.department_id=d.id AND ad.company_id=d.company_id
         WHERE d.company_id=$1 AND d.deleted_at IS NULL GROUP BY d.id ORDER BY d.name`, params
      ),
      db.query(
        `SELECT u.id, u.name, u.role, COUNT(ch.id)::int assigned_chats,
          COUNT(ch.id) FILTER (WHERE ch.status IN ('active','on_hold'))::int active_chats,
          COUNT(ch.id) FILTER (WHERE ch.status='closed')::int closed_chats,
          COALESCE((SELECT jsonb_agg(b) FROM (
            SELECT c.id, c.name, c.type, COUNT(h.id)::int total_chats,
              COUNT(h.id) FILTER (WHERE h.status='closed')::int closed_chats
            FROM chats h JOIN channels c ON c.id=h.channel_id AND c.company_id=h.company_id
            WHERE h.company_id=$1 AND h.agent_id=u.id
              AND h.created_at >= $2::timestamptz AND h.created_at < $3::timestamptz
            GROUP BY c.id ORDER BY c.name
          ) b), '[]'::jsonb) channels,
          COALESCE((SELECT jsonb_agg(b) FROM (
            SELECT d.id, COALESCE(d.name,'Sin departamento') name, COUNT(h.id)::int total_chats,
              COUNT(h.id) FILTER (WHERE h.status='closed')::int closed_chats
            FROM chats h LEFT JOIN departments d ON d.id=h.department_id AND d.company_id=h.company_id
            WHERE h.company_id=$1 AND h.agent_id=u.id
              AND h.created_at >= $2::timestamptz AND h.created_at < $3::timestamptz
            GROUP BY d.id ORDER BY name
          ) b), '[]'::jsonb) departments
        FROM users u LEFT JOIN chats ch ON ch.agent_id=u.id AND ch.company_id=u.company_id
          AND ch.created_at >= $2::timestamptz AND ch.created_at < $3::timestamptz
        WHERE u.company_id=$1 AND u.role::text IN ('agent','supervisor','admin')
        GROUP BY u.id ORDER BY u.name`, params
      )
    ]);
    return { companyId, summary: summary.rows[0], channels: channels.rows,
      departments: departments.rows, agents: agents.rows,
      period: { from: params[1], until: params[2], dateField: 'created_at' },
      generatedAt: new Date().toISOString() };
  });
};
