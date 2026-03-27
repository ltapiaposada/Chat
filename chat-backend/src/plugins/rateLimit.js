function createRateLimit({ windowMs, max, key, errorMessage = 'Too many requests' }) {
  const buckets = new Map();

  return async function rateLimit(request, reply) {
    const now = Date.now();
    const bucketKey = String(
      typeof key === 'function' ? key(request) : request.ip || request.headers['x-forwarded-for'] || 'anonymous'
    );
    const current = buckets.get(bucketKey);

    if (!current || current.expiresAt <= now) {
      buckets.set(bucketKey, {
        count: 1,
        expiresAt: now + windowMs
      });
      return;
    }

    current.count += 1;
    if (current.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      reply.header('Retry-After', retryAfterSeconds);
      return reply.status(429).send({ error: errorMessage });
    }
  };
}

module.exports = {
  createRateLimit
};
