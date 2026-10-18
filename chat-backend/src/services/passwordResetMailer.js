const nodemailer = require('nodemailer');

/**
 * Construye y valida la configuración SMTP para recuperación de contraseña.
 * @param {NodeJS.ProcessEnv|Object} [env=process.env] - Variables de configuración.
 * @returns {Object|null} Configuración de transporte o `null` si está incompleta.
 * @throws {Error} Si la URL pública de recuperación no es segura.
 */
function configuration(env = process.env) {
  if (!env.SMTP_HOST || !env.SMTP_FROM || !(env.PASSWORD_RESET_URL || env.CLIENT_URL)) return null;
  const url = new URL(env.PASSWORD_RESET_URL || env.CLIENT_URL);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && local && url.protocol === 'http:')) {
    throw new Error('Password reset frontend URL must use HTTPS');
  }
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new Error('Password reset URL must be the frontend origin');
  }
  const port = Number(env.SMTP_PORT || 587);
  const secure = String(env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true';
  return { origin: url.origin, from: env.SMTP_FROM, options: {
    host: env.SMTP_HOST, port, secure,
    requireTLS: !secure && !(env.NODE_ENV !== 'production' && ['localhost','127.0.0.1','::1'].includes(env.SMTP_HOST)),
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true
  } };
}

module.exports = {
  /**
   * Comprueba si el correo de recuperación puede utilizarse con seguridad.
   * @returns {boolean} Estado de la configuración SMTP.
   */
  isConfigured() { try { return Boolean(configuration()); } catch { return false; } },
  /**
   * Envía al usuario un enlace de un solo uso para cambiar su contraseña.
   * @param {string} email - Destinatario del correo.
   * @param {string} token - Token temporal de recuperación.
   * @returns {Promise<void>}
   * @throws {Error} Si SMTP no está configurado o el proveedor rechaza el envío.
   */
  async sendReset(email, token) {
    const config = configuration();
    if (!config) throw new Error('SMTP is not configured');
    const link = `${config.origin}/reset-password#token=${encodeURIComponent(token)}`;
    await nodemailer.createTransport(config.options).sendMail({
      from: config.from, to: email, subject: 'Recupera tu contraseña de Conversa',
      text: `Recibimos una solicitud para cambiar tu contraseña de Conversa.\n\nAbre este enlace para crear una nueva contraseña:\n${link}\n\nEl enlace vence en 30 minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.`
    });
  }
};
