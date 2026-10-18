const crypto = require('crypto');

/**
 * Obtiene el secreto utilizado para firmar y validar tokens de autenticación.
 *
 * @returns {string} Secreto configurado para la autenticación.
 * @throws {Error} Si la variable `AUTH_SECRET` no está definida.
 */
function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required');
  }
  return secret;
}

/**
 * Calcula la duración configurada de los tokens de autenticación.
 *
 * @returns {number} Tiempo de vida del token en milisegundos.
 */
function getTokenTtlMs() {
  return Number(process.env.AUTH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000);
}

/**
 * Codifica un valor usando Base64 compatible con URL.
 *
 * @param {string|Buffer} value - Valor que se desea codificar.
 * @returns {string} Representación codificada en Base64 URL.
 */
function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

/**
 * Decodifica una cadena Base64 URL como texto UTF-8.
 *
 * @param {string} value - Cadena codificada.
 * @returns {string} Texto decodificado.
 */
function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

/**
 * Firma un valor con HMAC SHA-256 usando el secreto de autenticación.
 *
 * @param {string} value - Contenido que se desea firmar.
 * @returns {string} Firma codificada en Base64 URL.
 * @throws {Error} Si no existe un secreto de autenticación configurado.
 */
function sign(value) {
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(value)
    .digest('base64url');
}

/**
 * Crea un token JWT firmado para un usuario de la plataforma.
 *
 * @param {Object} user - Usuario que iniciará sesión.
 * @param {number|string} user.id - Identificador del usuario.
 * @param {string} user.role - Rol autorizado.
 * @param {string} user.name - Nombre visible.
 * @param {string} [user.email] - Correo electrónico.
 * @param {number} [user.companyId] - Empresa en formato de dominio.
 * @param {number} [user.company_id] - Empresa en formato de persistencia.
 * @param {number} [user.channelId] - Canal en formato de dominio.
 * @param {number} [user.channel_id] - Canal en formato de persistencia.
 * @returns {string} Token JWT firmado.
 * @throws {Error} Si no existe un secreto de autenticación configurado.
 */
function createAuthToken(user) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = Math.floor(getTokenTtlMs() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  const payload = {
    sub: Number(user.id),
    role: user.role,
    name: user.name,
    email: user.email || null,
    companyId: user.companyId || user.company_id || null,
    channelId: user.channelId || user.channel_id || null,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifica la estructura, firma, vigencia y contexto empresarial de un token.
 *
 * @param {string} token - Token JWT recibido del cliente.
 * @returns {{userId: number, role: string, name: string, email: (string|null), companyId: number, channelId: (number|null)}} Identidad autenticada.
 * @throws {Error} Si el token es inválido, está vencido o no contiene empresa.
 */
function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, providedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !providedSignature) {
    throw new Error('Invalid token format');
  }

  const header = JSON.parse(fromBase64Url(encodedHeader));
  if (header?.alg !== 'HS256' || header?.typ !== 'JWT') {
    throw new Error('Invalid token header');
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);

  if (!providedSignature || providedSignature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));
  if (!payload?.sub || !payload?.role || !payload?.exp) {
    throw new Error('Invalid token payload');
  }
  if (!payload.companyId) {
    throw new Error('Invalid tenant context');
  }
  if (Math.floor(Date.now() / 1000) > Number(payload.exp)) {
    throw new Error('Token expired');
  }

  return {
    userId: Number(payload.sub),
    role: payload.role,
    name: payload.name || '',
    email: payload.email || null,
    companyId: payload.companyId ? Number(payload.companyId) : null,
    channelId: payload.channelId ? Number(payload.channelId) : null
  };
}

module.exports = {
  createAuthToken,
  verifyAuthToken
};
