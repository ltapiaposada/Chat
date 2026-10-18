const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createAuthToken } = require('../config/auth');
const { sanitizeEmail, sanitizeText } = require('../utils/sanitize');
const { createRateLimit } = require('../plugins/rateLimit');

const onboardingRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 3,
  key: (request) => `${request.ip}:${String(request.body?.email || '').toLowerCase()}`,
  errorMessage: 'Demasiados intentos de registro'
});

/**
 * Convierte un nombre en un slug URL-amigable: normaliza caracteres, minúsculas, guiones, máximo 100 caracteres.
 * @param {string} value - Nombre a convertir.
 * @returns {string} Slug normalizado.
 */
function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

/**
 * Valida y normaliza un origen (dominio) exacto con protocolo HTTP o HTTPS.
 * @param {string} value - URL del origen a validar.
 * @returns {string} Origen normalizado (solo scheme + host + port).
 * @throws {Error} Si el protocolo no es http/https o el formato no es un origen exacto.
 */
function normalizeOrigin(value) {
  const parsed = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== String(value).trim()) {
    throw new Error('El dominio debe ser un origen exacto, por ejemplo https://miempresa.com');
  }
  return parsed.origin;
}

/**
 * Registra las rutas de alta de empresas (onboarding).
 * Crea empresa, canal web por defecto, usuario administrador y registro de auditoría en una transacción.
 * @param {Object} fastify - Instancia de Fastify.
 * @param {Object} options - Opciones del plugin, incluye la conexión db.
 * @returns {Promise<void>}
 */
module.exports = async function companyOnboardingRoutes(fastify, options) {
  const db = options.db;

  // POST /api/companies/register — Registra una nueva empresa con su canal web, usuario admin y clave pública. Rate limit: 3/min por IP+email. Efectos: token de autenticación, registro de auditoría. Crea: empresa, canal, usuario, asignación agent-channel.
  fastify.post('/api/companies/register', {
    preHandler: onboardingRateLimit,
    schema: {
      body: {
        type: 'object', additionalProperties: false,
        required: ['companyName', 'adminName', 'email', 'password', 'origin'],
        properties: {
          companyName: { type: 'string', minLength: 2, maxLength: 160 },
          adminName: { type: 'string', minLength: 2, maxLength: 120 },
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 200 },
          origin: { type: 'string', minLength: 8, maxLength: 300 }
        }
      }
    }
  }, async (request, reply) => {
    const companyName = sanitizeText(request.body.companyName);
    const adminName = sanitizeText(request.body.adminName);
    const email = sanitizeEmail(request.body.email);
    let origin;
    try { origin = normalizeOrigin(request.body.origin); }
    catch (error) { return reply.status(400).send({ error: error.message }); }

    const baseSlug = slugify(companyName);
    if (!baseSlug) return reply.status(400).send({ error: 'Nombre de empresa inválido' });
    const companySlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    const publicKey = `ch_${crypto.randomUUID().replaceAll('-', '')}`;
    const signingSecret = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(request.body.password, 10);
    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      const duplicate = await client.query('SELECT id FROM users WHERE email=$1', [email]);
      if (duplicate.rows[0]) {
        await client.query('ROLLBACK');
        return reply.status(409).send({ error: 'El correo ya está registrado' });
      }
      const company = (await client.query(
        `INSERT INTO companies(name, slug) VALUES($1,$2) RETURNING id,name,slug,status`,
        [companyName, companySlug]
      )).rows[0];
      const channel = (await client.query(
        `INSERT INTO channels(company_id,name,slug,type,public_key,signing_secret,allowed_origins,authentication_mode,assertion_issuer)
         VALUES($1,'Sitio principal','sitio-principal','web',$2,$3,$4,'mixed','external-site')
         RETURNING id,name,slug,type,public_key,allowed_origins,authentication_mode,status`,
        [company.id, publicKey, signingSecret, [origin]]
      )).rows[0];
      const user = (await client.query(
        `INSERT INTO users(name,email,role,password_hash,company_id,is_active)
         VALUES($1,$2,'admin',$3,$4,true)
         RETURNING id,name,email,role,company_id`,
        [adminName, email, passwordHash, company.id]
      )).rows[0];
      await client.query(
        `INSERT INTO agent_channels(agent_id,channel_id,company_id) VALUES($1,$2,$3)`,
        [user.id, channel.id, company.id]
      );
      await client.query(
        `INSERT INTO admin_audit_logs(company_id,actor_id,channel_id,action,metadata)
         VALUES($1,$2,$3,'company.registered',$4::jsonb)`,
        [company.id, user.id, channel.id, JSON.stringify({ companyName, origin })]
      );
      await client.query('COMMIT');
      return reply.status(201).send({
        success: true,
        token: createAuthToken(user),
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        company,
        channel: { ...channel, publicKey: channel.public_key, allowedOrigins: channel.allowed_origins }
      });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      if (error.code === '23505') return reply.status(409).send({ error: 'La empresa o el correo ya están registrados' });
      throw error;
    } finally {
      client.release();
    }
  });
};
