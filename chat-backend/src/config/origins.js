require('dotenv').config({ quiet: true });

const DEFAULT_ORIGIN = 'http://localhost:5173';

/**
 * Convierte una lista de orígenes separada por comas en valores normalizados.
 *
 * @param {string} rawValue - Lista de orígenes sin procesar.
 * @returns {string[]} Orígenes no vacíos y sin espacios laterales.
 */
function splitOrigins(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Obtiene los orígenes autorizados para solicitudes HTTP y WebSocket.
 *
 * @returns {string[]} Orígenes configurados o el origen local predeterminado.
 */
function getAllowedOrigins() {
  const originFromClientUrl = splitOrigins(process.env.CLIENT_URL);
  const originFromCorsList = splitOrigins(process.env.CORS_ORIGINS);
  const combined = [...originFromClientUrl, ...originFromCorsList];
  return combined.length > 0 ? combined : [DEFAULT_ORIGIN];
}

/**
 * Determina si un origen puede acceder al backend según el entorno actual.
 *
 * @param {string|undefined} origin - Encabezado Origin de la solicitud.
 * @returns {boolean} `true` cuando el origen está permitido.
 */
function isAllowedOrigin(origin) {
  if (!origin) return true;
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (String(process.env.NODE_ENV).toLowerCase() !== 'production') {
    try {
      const parsed = new URL(origin);
      const configuredPorts = new Set(allowedOrigins.map((value) => new URL(value).port));
      const localHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '0.0.0.0' || parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.');
      if (parsed.protocol === 'http:' && localHost && configuredPorts.has(parsed.port)) return true;
    } catch (error) {
      return false;
    }
  }

  const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '')
    .toLowerCase()
    .trim();
  if (allowVercelPreviews !== 'true') {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return parsed.hostname.endsWith('.vercel.app');
  } catch (error) {
    return false;
  }
}

/**
 * Crea el validador de orígenes utilizado por el complemento CORS.
 *
 * @returns {Function} Función compatible con la opción `origin` de Fastify CORS.
 */
function createCorsOriginValidator() {
  return (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    const error = new Error(`Origin not allowed by CORS: ${origin}`);
    error.statusCode = 403;
    callback(error, false);
  };
}

module.exports = {
  getAllowedOrigins,
  isAllowedOrigin,
  createCorsOriginValidator
};
