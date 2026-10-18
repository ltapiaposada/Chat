/**
 * Crea un limitador de solicitudes en memoria por ventana temporal.
 * @param {Object} options - Ventana, límite, clave y mensaje de error.
 * @returns {Function} Pre-handler asíncrono de Fastify.
 */
function createRateLimit({ windowMs, max, key, errorMessage = 'Too many requests' }) {
  const buckets = new Map();
  let requestsSinceCleanup = 0;

  /**
   * Registra el intento y rechaza las solicitudes que superen el límite.
   * @param {Object} request - Solicitud de Fastify.
   * @param {Object} reply - Respuesta de Fastify.
   * @returns {Promise<void|Object>}
   */
  return async function rateLimit(request, reply) {
    const now = Date.now();
    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 500) {
      requestsSinceCleanup = 0;
      for (const [storedKey, bucket] of buckets.entries()) {
        if (bucket.expiresAt <= now) buckets.delete(storedKey);
      }
    }
    const bucketKey = String(
      typeof key === 'function' ? key(request) : request.ip || request.headers['x-forwarded-for'] || 'anonymous'
    );
    const current = buckets.get(bucketKey);

    if (!current || current.expiresAt <= now) {
      buckets.set(bucketKey, {
        count: 1,
        expiresAt: now + windowMs
      });
      reply.header('X-RateLimit-Limit', max);
      reply.header('X-RateLimit-Remaining', Math.max(0, max - 1));
      return;
    }

    current.count += 1;
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', Math.max(0, max - current.count));
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
