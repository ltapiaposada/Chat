require('dotenv').config();

const DEFAULT_ORIGIN = 'http://localhost:5173';

function splitOrigins(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getAllowedOrigins() {
  const originFromClientUrl = splitOrigins(process.env.CLIENT_URL);
  const originFromCorsList = splitOrigins(process.env.CORS_ORIGINS);
  const combined = [...originFromClientUrl, ...originFromCorsList];
  return combined.length > 0 ? combined : [DEFAULT_ORIGIN];
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    return true;
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

function createCorsOriginValidator() {
  return (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
  };
}

module.exports = {
  getAllowedOrigins,
  isAllowedOrigin,
  createCorsOriginValidator
};
