/**
 * Registra encabezados defensivos para todas las respuestas HTTP.
 * @param {Object} fastify - Instancia del servidor.
 * @returns {void}
 */
function registerSecurityHeaders(fastify) {
  // Aplica políticas de navegador antes de entregar cada respuesta.
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-site');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    reply.header('Cache-Control', request.url === '/' ? 'no-cache' : 'no-store');
    return payload;
  });
}

module.exports = { registerSecurityHeaders };
