const crypto = require('crypto');
const db = require('../infrastructure/database/postgres');

const ASSERTION_AUDIENCE = 'support-chat-widget';
const MAX_ASSERTION_TTL_SECONDS = 300;
const CLOCK_SKEW_SECONDS = 30;

/** @param {string} value - Valor que se desea codificar. @returns {string} Valor en Base64 URL. */
function encode(value) {
  return Buffer.from(value).toString('base64url');
}

/** @param {string} value - JSON codificado. @returns {Object} Objeto decodificado. */
function decodeJson(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

/**
 * Calcula una identidad irreversible mediante HMAC SHA-256.
 * @param {*} value - Valor de identidad.
 * @param {string} secret - Secreto del canal.
 * @returns {string} Resumen hexadecimal.
 */
function digest(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

/**
 * Compara firmas en tiempo constante.
 * @param {*} left - Primera firma.
 * @param {*} right - Segunda firma.
 * @returns {boolean} Resultado de la comparación.
 */
function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Construye una identidad anónima estable y aislada por canal.
 * @param {Object} channel - Canal del widget.
 * @param {string} visitorId - Identificador persistido en el navegador.
 * @returns {Object} Identidad normalizada.
 */
function anonymousIdentity(channel, visitorId) {
  const pepper = process.env.VISITOR_ID_PEPPER || process.env.AUTH_SECRET;
  if (!pepper) throw new Error('VISITOR_ID_PEPPER or AUTH_SECRET is required');
  return {
    provider: 'widget-anonymous',
    externalUserId: digest(`${channel.id}:${visitorId}`, pepper),
    name: 'Visitante',
    email: null
  };
}

/**
 * Normaliza la identidad autenticada informada por el sitio anfitrión.
 * @param {Object} channel - Canal del widget.
 * @param {Object} input - Identidad proporcionada por el frontend.
 * @returns {Object} Identidad normalizada y seudonimizada.
 */
function clientReportedIdentity(channel, input) {
  if (!input || !input.id) throw new Error('Authenticated identity is incomplete');
  const subject = String(input.id).trim();
  if (!subject) throw new Error('Authenticated identity is incomplete');
  return {
    provider: 'widget-client-session',
    externalUserId: digest(`${channel.id}:${subject}`, channel.signing_secret),
    name: String(input.name || 'Usuario autenticado').trim().slice(0, 120),
    email: input.email ? String(input.email).trim().toLowerCase().slice(0, 255) : null
  };
}

/**
 * Verifica una aserción firmada y bloquea la reutilización de su nonce.
 * @param {Object} channel - Canal que emitió la configuración de firma.
 * @param {string} assertion - JWT firmado por el sistema del cliente.
 * @param {number} [nowSeconds] - Hora de referencia para pruebas.
 * @returns {Promise<Object>} Identidad autenticada normalizada.
 * @throws {Error} Si la firma, vigencia, audiencia, emisor o nonce son inválidos.
 */
async function verifyAssertion(channel, assertion, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(assertion || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid assertion format');
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedPayload);
  if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('Invalid assertion header');

  const expected = crypto
    .createHmac('sha256', channel.signing_secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  if (!safeEqual(signature, expected)) throw new Error('Invalid assertion signature');

  if (claims.iss !== channel.assertion_issuer) throw new Error('Invalid assertion issuer');
  if (claims.aud !== ASSERTION_AUDIENCE) throw new Error('Invalid assertion audience');
  if (claims.channel !== channel.public_key) throw new Error('Invalid assertion channel');
  if (!claims.sub || !claims.nonce || !claims.iat || !claims.exp) throw new Error('Incomplete assertion');
  if (Number(claims.exp) <= nowSeconds - CLOCK_SKEW_SECONDS) throw new Error('Assertion expired');
  if (Number(claims.iat) > nowSeconds + CLOCK_SKEW_SECONDS) throw new Error('Assertion issued in the future');
  if (Number(claims.exp) - Number(claims.iat) > MAX_ASSERTION_TTL_SECONDS) throw new Error('Assertion lifetime is too long');

  const nonceHash = digest(claims.nonce, channel.signing_secret);
  try {
    await db.query(
      'DELETE FROM widget_assertion_nonces WHERE channel_id = $1 AND expires_at < CURRENT_TIMESTAMP',
      [channel.id]
    );
    await db.query(
      `INSERT INTO widget_assertion_nonces (channel_id, nonce_hash, expires_at)
       VALUES ($1, $2, to_timestamp($3))`,
      [channel.id, nonceHash, Number(claims.exp)]
    );
  } catch (error) {
    if (error.code === '23505') throw new Error('Assertion replay detected');
    throw error;
  }

  return {
    provider: `widget-assertion:${channel.assertion_issuer}`,
    externalUserId: digest(`${channel.id}:${claims.sub}`, channel.signing_secret),
    name: String(claims.name || 'Usuario').slice(0, 120),
    email: claims.email ? String(claims.email).trim().toLowerCase().slice(0, 255) : null
  };
}

/**
 * Genera una aserción válida para escenarios automatizados.
 * @param {Object} channel - Canal con secreto de firma.
 * @param {Object} claims - Declaraciones que se desean firmar.
 * @returns {string} JWT de prueba.
 */
function createAssertionForTesting(channel, claims) {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encode(JSON.stringify(claims));
  const signature = crypto.createHmac('sha256', channel.signing_secret)
    .update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

module.exports = {
  ASSERTION_AUDIENCE,
  MAX_ASSERTION_TTL_SECONDS,
  anonymousIdentity,
  clientReportedIdentity,
  createAssertionForTesting,
  verifyAssertion
};
