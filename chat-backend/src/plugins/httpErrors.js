function validationDetails(error) {
  if (!Array.isArray(error?.validation)) return [];

  return error.validation.map((item) => ({
    field: item.instancePath || item.params?.missingProperty || '',
    message: item.message || 'Invalid value'
  }));
}

function registerHttpErrorHandling(fastify) {
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

  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({ error: 'Route not found' });
  });
}

module.exports = {
  registerHttpErrorHandling
};
