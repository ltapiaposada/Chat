/**
 * @file http-errors.test.js
 * @description Pruebas del plugin de manejo de errores HTTP.
 * Los tests están escritos en español. Verifican que los errores de validación
 * se mapean a respuestas 400, que los detalles internos del servidor quedan
 * ocultos en los 500 y que las rutas inexistentes devuelven 404.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { registerHttpErrorHandling } = require('../src/plugins/httpErrors');

/**
 * Crea un stub de Fastify que captura los handlers de error y de ruta no encontrada.
 * @returns {{ errorHandler: Function|null, notFoundHandler: Function|null, setErrorHandler: Function, setNotFoundHandler: Function }} Stub de Fastify.
 */
function createFastifyStub() {
  return {
    errorHandler: null,
    notFoundHandler: null,
    setErrorHandler(handler) {
      this.errorHandler = handler;
    },
    setNotFoundHandler(handler) {
      this.notFoundHandler = handler;
    }
  };
}

/**
 * Crea un stub de respuesta que captura el código de estado y el payload enviado.
 * @returns {{ sent: boolean, statusCode: number|null, payload: unknown|null, status: Function, send: Function }} Stub de reply de Fastify.
 */
function createReplyStub() {
  return {
    sent: false,
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('http error handling maps validation errors to 400 payload', () => {
  const fastify = createFastifyStub();
  registerHttpErrorHandling(fastify);

  const reply = createReplyStub();
  fastify.errorHandler(
    {
      validation: [
        {
          instancePath: '/email',
          message: 'must match format "email"'
        }
      ]
    },
    { log: { error() {} } },
    reply
  );

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(reply.payload, {
    error: 'Invalid request payload',
    details: [
      {
        field: '/email',
        message: 'must match format "email"'
      }
    ]
  });
});

test('http error handling hides internal server details', () => {
  const fastify = createFastifyStub();
  registerHttpErrorHandling(fastify);

  const reply = createReplyStub();
  let logged = false;
  fastify.errorHandler(
    new Error('database leaked secret'),
    { log: { error() { logged = true; } } },
    reply
  );

  assert.equal(reply.statusCode, 500);
  assert.deepEqual(reply.payload, { error: 'Internal server error' });
  assert.equal(logged, true);
});

test('http error handling returns 404 for missing routes', () => {
  const fastify = createFastifyStub();
  registerHttpErrorHandling(fastify);

  const reply = createReplyStub();
  fastify.notFoundHandler({}, reply);

  assert.equal(reply.statusCode, 404);
  assert.deepEqual(reply.payload, { error: 'Route not found' });
});
