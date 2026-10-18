/**
 * Valida que la configuración de producción use secretos, orígenes y base de datos seguros.
 *
 * @param {NodeJS.ProcessEnv|Object} [env=process.env] - Variables que se desean validar.
 * @returns {void}
 * @throws {Error} Si encuentra una o más configuraciones inseguras.
 */
function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const errors = [];
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || env.AUTH_SECRET === 'change_this_secret') {
    errors.push('AUTH_SECRET must contain at least 32 characters');
  }
  if (!env.WHATSAPP_CREDENTIALS_KEY || env.WHATSAPP_CREDENTIALS_KEY.length < 32) {
    errors.push('WHATSAPP_CREDENTIALS_KEY must contain at least 32 characters');
  }
  if (env.AUTH_SECRET && env.AUTH_SECRET === env.WHATSAPP_CREDENTIALS_KEY) {
    errors.push('AUTH_SECRET and WHATSAPP_CREDENTIALS_KEY must be different');
  }
  const origins = [env.CLIENT_URL, ...(env.CORS_ORIGINS || '').split(',')].filter(Boolean);
  if (!origins.length || origins.some((origin) => /localhost|127\.0\.0\.1/.test(origin))) {
    errors.push('production origins must be explicit HTTPS public origins');
  }
  if (origins.some((origin) => !String(origin).trim().startsWith('https://'))) {
    errors.push('production origins must use HTTPS');
  }
  if (!env.DATABASE_URL && (!env.DB_PASSWORD || env.DB_PASSWORD === 'postgres')) {
    errors.push('production database credentials must be configured');
  }
  if (errors.length) throw new Error(`Unsafe production configuration: ${errors.join('; ')}`);
}

module.exports = { validateProductionConfig };
