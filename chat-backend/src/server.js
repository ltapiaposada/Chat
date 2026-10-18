require('dotenv').config();
/**
 * @file server.js
 * @description Punto de entrada principal del servidor Fastify.
 * Configura rutas HTTP, middlewares, autenticación, límites de tasa,
 * conexiones WebSocket y ciclo de vida del servidor.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fastify = require('fastify')({ logger: true });
const db = require('./infrastructure/database/postgres');
const { ensureSchema } = require('./infrastructure/database/ensureSchema');
const { runMigrations } = require('./infrastructure/database/migrate');
const socketService = require('./infrastructure/websocket/socket');
const storageChatRoutes = require('./routes/storageChat');
const whatsappRoutes = require('./routes/whatsapp');
const adminChannelRoutes = require('./routes/adminChannels');
const adminDepartmentRoutes = require('./routes/adminDepartments');
const adminMetricsRoutes = require('./routes/adminMetrics');
const companyOnboardingRoutes = require('./routes/companyOnboarding');
const { createAuthToken } = require('./config/auth');
const { validateProductionConfig } = require('./config/productionSecurity');
const { createCorsOriginValidator, getAllowedOrigins } = require('./config/origins');
const { requireRole } = require('./plugins/auth');
const { registerHttpErrorHandling } = require('./plugins/httpErrors');
const { registerSecurityHeaders } = require('./plugins/securityHeaders');
const { createRateLimit } = require('./plugins/rateLimit');
const { sanitizeEmail, sanitizeText } = require('./utils/sanitize');
const widgetIdentityService = require('./services/widgetIdentityService');
const publicUrlService = require('./services/publicUrlService');
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 15000);
const DB_STARTUP_RETRIES = Math.max(1, Number(process.env.DB_STARTUP_RETRIES || 5));
const DB_STARTUP_RETRY_MS = Math.max(0, Number(process.env.DB_STARTUP_RETRY_MS || 1000));

// Definición de acciones disponibles para el asistente de IA
const AI_ACTIONS = {
  friendlier: "Reescribe el texto para que suene mas amable y cordial, sin cambiar el significado.",
  more_formal: "Reescribe el texto con un tono mas formal y profesional, sin cambiar el significado.",
  shorter: "Reescribe el texto de forma mas breve y directa, manteniendo la idea principal.",
  more_detailed: "Amplia el texto con mas detalle y claridad, sin agregar informacion inventada.",
  fix_grammar: "Corrige ortografia y gramatica manteniendo el mensaje.",
  simplify: "Simplifica el texto para que sea facil de entender.",
  summarize: "Resume el texto en una version corta y clara.",
  translate_en: "Traduce el texto al ingles manteniendo el sentido.",
  translate_es: "Traduce el texto al espanol manteniendo el sentido.",
  steps: "Convierte el texto en una lista de pasos claros.",
  add_empathy: "Reescribe el texto agregando empatia y comprension hacia el cliente.",
  professional: "Reescribe el texto como un mensaje profesional de soporte al cliente."
};

// Límite de tasa: máximo 5 intentos de login por minuto por IP y email
const loginRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 5,
  key: (request) => `${request.ip}:${String(request.body?.email || '').trim().toLowerCase() || 'unknown'}`,
  errorMessage: 'Too many login attempts'
});

// Límite de tasa: máximo 3 intentos de registro por minuto por IP y email
const registerRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 3,
  key: (request) => `${request.ip}:${String(request.body?.email || '').trim().toLowerCase() || 'unknown'}`,
  errorMessage: 'Too many registration attempts'
});

// Límite de tasa: máximo 30 solicitudes de IA por minuto por IP y usuario
const aiAssistRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 30,
  key: (request) => `${request.ip}:${request.auth?.userId || 'anonymous'}`,
  errorMessage: 'Too many AI requests'
});

// Límite de tasa: máximo 100 solicitudes por canal del widget por minuto
const widgetChannelRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 100,
  key: (request) => request.body?.channelKey || 'unknown-channel',
  errorMessage: 'Too many requests for this channel'
});

// Límite de tasa: máximo 60 solicitudes del widget por IP por minuto
const widgetIpRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 60,
  key: (request) => request.ip,
  errorMessage: 'Too many widget requests from this IP'
});

// Límite de tasa: máximo 20 solicitudes de sesión del widget por identidad por minuto
const widgetIdentityRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 20,
  key: (request) => {
    const identity = request.body?.visitorId || request.body?.assertion || request.body?.identity?.id || 'missing';
    const identityHash = crypto.createHash('sha256').update(String(identity)).digest('hex');
    return `${request.body?.channelKey || 'unknown'}:${identityHash}`;
  },
  errorMessage: 'Too many widget session requests'
});

// Importar rutas
// const routes = require('./presentation/routes');

// Registrar rutas
// fastify.register(routes);

// Habilitar CORS para todas las rutas
fastify.register(require('@fastify/cors'), {
  origin: createCorsOriginValidator(),
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']
});
registerHttpErrorHandling(fastify);
registerSecurityHeaders(fastify);

// Registrar rutas de almacenamiento (aisladas)
fastify.register(storageChatRoutes);
// Registrar rutas de webhook de WhatsApp
fastify.register(whatsappRoutes);
// Registrar rutas de administración de canales
fastify.register(adminChannelRoutes, { db });
// Registrar rutas de administración de departamentos
fastify.register(adminDepartmentRoutes, { db });
// Registrar rutas de métricas de administración
fastify.register(adminMetricsRoutes, { db });
// Registrar rutas de onboarding de empresa
fastify.register(companyOnboardingRoutes, { db });
// Registrar rutas de restablecimiento de contraseña
fastify.register(require('./routes/passwordReset'), { db });

// Ruta de verificación de salud del servidor
fastify.get('/', async (request, reply) => {
  return { status: 'ok', message: 'Chat Backend API' };
});

// Endpoint de inicio de sesión
fastify.post('/api/login', {
  preHandler: loginRateLimit,
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', maxLength: 255 },
        password: { type: 'string', minLength: 1, maxLength: 200 }
      }
    }
  }
}, async (request, reply) => {
  const email = sanitizeEmail(request.body?.email);
  const password = sanitizeText(request.body?.password);
  
  try {
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email y contraseña requeridos' });
    }

    // Autenticación simple — en producción usar hashing adecuado de contraseñas
    const result = await db.query(
      'SELECT id, name, email, role, password_hash, company_id, channel_id FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
    
    const user = result.rows[0];

    let isValid = false;
    if (user.password_hash) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else if (password === '1234') {
      // Cuentas demo heredadas: actualizar a contraseña hasheada en el primer inicio de sesión
      isValid = true;
      const newHash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    }
    
    if (!isValid) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
    
    return {
      success: true,
      token: createAuthToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return reply.status(500).send({ error: 'Error del servidor' });
  }
});

// Endpoint de registro de cliente
fastify.post('/api/register-client', {
  preHandler: registerRateLimit,
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 120 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        password: { type: 'string', minLength: 4, maxLength: 200 }
      }
    }
  }
}, async (request, reply) => {
  const name = sanitizeText(request.body?.name);
  const email = sanitizeEmail(request.body?.email);
  const password = sanitizeText(request.body?.password);
  
  try {
    if (!name || !email || !password || password.length < 4) {
      return reply.status(400).send({ error: 'Nombre, email y contraseña válida requeridos' });
    }

    // Verificar si el email ya existe
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return reply.status(400).send({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Crear usuario cliente
    const result = await db.query(
      `INSERT INTO users (name, email, role, password_hash, company_id, channel_id)
       SELECT $1, $2, $3, $4, c.company_id, c.id
       FROM channels c
       JOIN companies co ON co.id = c.company_id
       WHERE co.slug = 'default-company' AND c.slug = 'demo' AND c.status = 'active'
       RETURNING id, name, email, role, company_id, channel_id`,
      [name, email, 'client', passwordHash]
    );
    
    const user = result.rows[0];
    
    return {
      success: true,
      token: createAuthToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Register error:', error);
    return reply.status(500).send({ error: 'Error del servidor' });
  }
});

// Endpoint que resuelve el cliente autenticado a partir de un token firmado.
// Los widgets embebidos usan este endpoint en lugar de confiar en datos del host.
fastify.get('/api/client/session', {
  preHandler: requireRole('client')
}, async (request) => {
  return {
    user: {
      id: request.auth.userId,
      name: request.auth.name,
      email: request.auth.email,
      role: request.auth.role
    }
  };
});

// Sesión pública del widget, similar a proveedores de chat alojados.
// El visitorId aleatorio es la identidad del portador y se persiste por el loader en el navegador.
fastify.post('/api/widget/session', {
  preHandler: [widgetChannelRateLimit, widgetIpRateLimit, widgetIdentityRateLimit],
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['channelKey'],
      properties: {
        channelKey: { type: 'string', minLength: 20, maxLength: 80, pattern: '^ch_[A-Za-z0-9_-]+$' },
        visitorId: { type: 'string', minLength: 24, maxLength: 120, pattern: '^[A-Za-z0-9_-]+$' },
        assertion: { type: 'string', minLength: 20, maxLength: 4096 },
        identity: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 255 },
            name: { type: 'string', minLength: 1, maxLength: 120 },
            email: { anyOf: [{ type: 'string', maxLength: 255 }, { type: 'null' }] }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const channelKey = sanitizeText(request.body.channelKey);
  const visitorId = sanitizeText(request.body.visitorId);
  const assertion = sanitizeText(request.body.assertion);
  const reportedIdentity = request.body.identity;

  const channelResult = await db.query(`
    SELECT id, company_id, public_key, authentication_mode, allowed_origins,
           signing_secret, assertion_issuer, credential_version
    FROM channels
    WHERE status = 'active'
      AND public_key = $1
    LIMIT 1
  `, [channelKey]);

  if (channelResult.rows.length === 0) {
    return reply.status(404).send({ error: 'Canal de chat no encontrado o inactivo' });
  }

  const channel = channelResult.rows[0];
  const requestOrigin = request.headers.origin;
  if (!requestOrigin || !channel.allowed_origins.includes(requestOrigin)) {
    return reply.status(403).send({ error: 'Origen no autorizado para este canal' });
  }

  let identity;
  try {
    if (assertion) {
      if (channel.authentication_mode === 'anonymous') {
        return reply.status(403).send({ error: 'Este canal solo permite visitantes anónimos' });
      }
      identity = await widgetIdentityService.verifyAssertion(channel, assertion);
    } else if (channel.authentication_mode === 'anonymous') {
      if (!visitorId) {
        return reply.status(400).send({ error: 'visitorId es requerido para visitantes anónimos' });
      }
      identity = widgetIdentityService.anonymousIdentity(channel, visitorId);
    } else if (reportedIdentity) {
      identity = widgetIdentityService.clientReportedIdentity(channel, reportedIdentity);
    } else {
      if (channel.authentication_mode === 'authenticated') {
        return reply.status(401).send({ error: 'Este canal requiere una sesión autenticada' });
      }
      if (!visitorId) {
        return reply.status(400).send({ error: 'visitorId es requerido para visitantes anónimos' });
      }
      identity = widgetIdentityService.anonymousIdentity(channel, visitorId);
    }
  } catch (error) {
    request.log.warn({ err: error, channelId: channel.id }, 'widget identity rejected');
    return reply.status(401).send({ error: 'Identidad del widget no válida' });
  }

  const result = await db.query(`
    INSERT INTO users
      (name, role, identity_provider, external_user_id, external_email, company_id, channel_id)
    VALUES ($1, 'client', $2, $3, $4, $5, $6)
    ON CONFLICT (identity_provider, channel_id, external_user_id)
      WHERE identity_provider IS NOT NULL AND channel_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      external_email = EXCLUDED.external_email,
      company_id = EXCLUDED.company_id,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, name, role, company_id, channel_id
  `, [identity.name, identity.provider, identity.externalUserId, identity.email, channel.company_id, channel.id]);

  const user = result.rows[0];
  return { token: createAuthToken(user), user, channel: { id: channel.id, key: channel.public_key } };
});

// Endpoint de asistencia con IA (Gemini)
fastify.post('/api/ai/assist', {
  preHandler: [requireRole('agent'), aiAssistRateLimit],
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['text', 'action'],
      properties: {
        text: { type: 'string', minLength: 1, maxLength: 8000 },
        action: { type: 'string', enum: Object.keys(AI_ACTIONS) }
      }
    }
  }
}, async (request, reply) => {
  try {
    const input = sanitizeText(request.body?.text);
    const action = sanitizeText(request.body?.action);
    const instruction = AI_ACTIONS[action];

    if (!input) {
      return reply.status(400).send({ error: 'Texto requerido' });
    }
    if (!instruction) {
      return reply.status(400).send({ error: 'Accion no valida' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return reply.status(500).send({ error: 'IA no configurada' });
    }

    const prompt = `Eres un asistente de escritura para agentes de soporte.\nAccion: ${instruction}\nTexto original:\n${input}\n\nResponde solo con el texto final, sin comillas ni explicaciones.`;
    const modelId = GEMINI_MODEL.replace(/^models\//, '');
    const url = `${GEMINI_API_URL}/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 512
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      request.log.error({ status: response.status, body: errText }, 'Gemini error');
      return reply.status(502).send({ error: 'Error al procesar IA' });
    }

    const data = await response.json();
    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = String(output).trim();

    return reply.send({ text: cleaned || input });
  } catch (error) {
    request.log.error({ err: error }, 'ai assist error');
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return reply.status(504).send({ error: 'La IA tardó demasiado en responder' });
    }
    return reply.status(500).send({ error: 'Error del servidor' });
  }
});

/**
 * Espera un tiempo determinado en milisegundos.
 * @param {number} ms - Milisegundos a esperar.
 * @returns {Promise} Promesa que se resuelve tras el tiempo indicado.
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Espera a que la base de datos esté disponible, reintenta un número configurable de veces.
 * @throws {Error} Si no se puede conectar después de todos los reintentos.
 */
async function waitForDatabase() {
  for (let attempt = 1; attempt <= DB_STARTUP_RETRIES; attempt += 1) {
    try {
      await db.query('SELECT NOW()');
      return;
    } catch (error) {
      if (attempt === DB_STARTUP_RETRIES) throw error;
      // La conexión a la base de datos falló durante el inicio; reintentando
      fastify.log.warn(
        { err: error, attempt, retries: DB_STARTUP_RETRIES },
        'Database connection failed during startup; retrying'
      );
      await wait(DB_STARTUP_RETRY_MS);
    }
  }
}

/**
 * Inicia el servidor: valida configuración, ejecuta migraciones,
 * inicia Fastify y Socket.IO, y configura túnel de desarrollo.
 */
const start = async () => {
  try {
    validateProductionConfig();
    await waitForDatabase();
    createAuthToken({ id: 0, role: 'agent', name: 'auth-check', email: null });
    console.log('Database connection successful');
    await runMigrations(db);
    console.log('Database migrations applied');
    await ensureSchema(db);
    console.log('Database schema ensured');

    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
    console.log(`Allowed origins: ${getAllowedOrigins().join(', ')}`);

    // Inicializar Socket.IO
    socketService.initialize(fastify.server);
    publicUrlService.startDevelopmentTunnel({ port, logger: fastify.log });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Apagado graceful
let isShuttingDown = false;
/**
 * Maneja el apagado graceful del servidor: cierra tunnels, Fastify y la base de datos.
 */
const gracefulShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\nShutting down gracefully...');
  try {
    publicUrlService.stopDevelopmentTunnel();
    await fastify.close();
    await db.close();
    console.log('Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

start();
