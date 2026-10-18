/**
 * Convierte errores de validación de Fastify en detalles públicos.
 * @param {Object} error - Error recibido.
 * @returns {Object[]} Campos inválidos.
 */
function validationDetails(error) {
  if (!Array.isArray(error?.validation)) return [];

  return error.validation.map((item) => ({
    field: item.instancePath || item.params?.missingProperty || '',
    message: item.message || 'Invalid value'
  }));
}

/**
 * Registra manejadores globales de errores y rutas inexistentes.
 * @param {Object} fastify - Instancia del servidor.
 * @returns {void}
 */
function registerHttpErrorHandling(fastify) {
  // Evita exponer detalles internos y conserva información útil de validación.
  fastify.setErrorHandler((error, request, reply) => {
    if (reply.sent) return;

    if (error?.validation) {
      return reply.status(400).send({
        error: 'Invalid request payload',
        details: validationDetails(error)
      });
    }

    const statusCode =
      Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'unhandled request error');
      return reply.status(500).send({ error: 'Internal server error' });
    }

    return reply.status(statusCode).send({
      error: error?.message || 'Request failed'
    });
  });

  // Devuelve una respuesta uniforme para rutas no registradas.
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({ error: 'Route not found' });
  });
}

module.exports = {
  registerHttpErrorHandling
};
