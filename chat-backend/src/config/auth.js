const crypto = require('crypto');

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required');
  }
  return secret;
}

function getTokenTtlMs() {
  return Number(process.env.AUTH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000);
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value) {
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(value)
    .digest('base64url');
}

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
