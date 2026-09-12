const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createRateLimit } = require('../plugins/rateLimit');
const defaultMailer = require('../services/passwordResetMailer');
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const genericMessage = 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña. Revisa también la carpeta de spam.';

module.exports = async function passwordResetRoutes(fastify, { db, mailer = defaultMailer }) {
  const ipLimit = createRateLimit({ windowMs: 15*60000, max: 15, errorMessage: 'Demasiados intentos. Inténtalo más tarde.' });
  const emailLimit = createRateLimit({ windowMs: 15*60000, max: 3, key: r => String(r.body?.email || '').trim().toLowerCase(), errorMessage: 'Espera unos minutos antes de solicitar otro enlace.' });
  fastify.post('/api/password/forgot', {
    preHandler: [ipLimit, emailLimit],
    schema: { body: { type: 'object', additionalProperties: false, required: ['email'], properties: { email: { type: 'string', format: 'email', maxLength: 255 } } } }
  }, async (request, reply) => {
    if (!mailer.isConfigured()) return reply.status(503).send({ error: 'La recuperación por correo aún no está disponible. Contacta al administrador.' });
    const email = request.body.email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');
    const result = await db.query('SELECT id, company_id FROM users WHERE email=$1 AND is_active=true AND password_hash IS NOT NULL', [email]);
    const user = result.rows[0];
    if (user) {
      const tokenHash = hashToken(token);
      await db.query(`INSERT INTO password_reset_tokens(user_id,company_id,token_hash,expires_at)
        VALUES($1,$2,$3,CURRENT_TIMESTAMP + INTERVAL '30 minutes')
        ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,
          company_id=EXCLUDED.company_id, expires_at=EXCLUDED.expires_at, used_at=NULL, created_at=CURRENT_TIMESTAMP`,
      [user.id, user.company_id, tokenHash]);
      try { await mailer.sendReset(email, token); }
      catch {
        await db.query('DELETE FROM password_reset_tokens WHERE user_id=$1 AND token_hash=$2', [user.id, tokenHash]);
        request.log.error('Password recovery email could not be delivered');
      }
    }
    return { message: genericMessage };
  });

  fastify.post('/api/password/reset', {
    preHandler: ipLimit,
    schema: { body: { type: 'object', additionalProperties: false, required: ['token','password'], properties: {
      token: { type: 'string', pattern: '^[a-f0-9]{64}$' }, password: { type: 'string', minLength: 8, maxLength: 72 }
    } } }
  }, async (request, reply) => {
    if (Buffer.byteLength(request.body.password, 'utf8') > 72) return reply.status(400).send({ error: 'La contraseña es demasiado larga. Usa como máximo 72 bytes.' });
    const passwordHash = await bcrypt.hash(request.body.password, 12);
    const result = await db.query(`WITH consumed AS (
      UPDATE password_reset_tokens r SET used_at=CURRENT_TIMESTAMP FROM users u
      WHERE r.token_hash=$1 AND r.used_at IS NULL AND r.expires_at>CURRENT_TIMESTAMP
        AND u.id=r.user_id AND u.company_id=r.company_id AND u.is_active=true
      RETURNING r.user_id,r.company_id
    ) UPDATE users u SET password_hash=$2,updated_at=CURRENT_TIMESTAMP FROM consumed c
      WHERE u.id=c.user_id AND u.company_id=c.company_id RETURNING u.id`, [hashToken(request.body.token),passwordHash]);
    if (!result.rows[0]) return reply.status(400).send({ error: 'Este enlace ya no es válido o ha vencido. Solicita uno nuevo.' });
    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  });
};
