require('dotenv').config();
const bcrypt = require('bcryptjs');
const fastify = require('fastify')({ logger: true });
const db = require('./infrastructure/database/postgres');
const { ensureSchema } = require('./infrastructure/database/ensureSchema');
const socketService = require('./infrastructure/websocket/socket');
const storageChatRoutes = require('./routes/storageChat');
const whatsappRoutes = require('./routes/whatsapp');
const { createCorsOriginValidator, getAllowedOrigins } = require('./config/origins');
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

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
// Import routes
// const routes = require('./presentation/routes');

// Register routes
// fastify.register(routes);

// Enable CORS for all routes
fastify.register(require('@fastify/cors'), {
  origin: createCorsOriginValidator(),
  credentials: true
});

// Register storage routes (isolated)
fastify.register(storageChatRoutes);
// Register WhatsApp webhook routes
fastify.register(whatsappRoutes);

// Health check route
fastify.get('/', async (request, reply) => {
  return { status: 'ok', message: 'Chat Backend API' };
});

// Login endpoint
fastify.post('/api/login', async (request, reply) => {
  const { email, password } = request.body;
  
  try {
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email y contraseña requeridos' });
    }

    // Simple authentication - in production use proper password hashing
    const result = await db.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
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
      // Legacy demo accounts: upgrade to hashed password on first login
      isValid = true;
      const newHash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    }
    
    if (!isValid) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
    
    return {
      success: true,
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

// Register client endpoint
fastify.post('/api/register-client', async (request, reply) => {
  const { name, email, password } = request.body;
  
  try {
    if (!name || !email || !password || password.length < 4) {
      return reply.status(400).send({ error: 'Nombre, email y contraseña válida requeridos' });
    }

    // Check if email exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return reply.status(400).send({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create client user
    const result = await db.query(
      'INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, 'client', passwordHash]
    );
    
    const user = result.rows[0];
    
    return {
      success: true,
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
// AI assist endpoint (Gemini)
fastify.post('/api/ai/assist', async (request, reply) => {
  try {
    const { text, action } = request.body || {};
    const input = typeof text === 'string' ? text.trim() : '';
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
    return reply.status(500).send({ error: 'Error del servidor' });
  }
});

const start = async () => {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('âœ… Database connection successful');
    await ensureSchema(db);
    console.log('âœ… Database schema ensured');

    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`ðŸš€ Server listening on port ${port}`);
    console.log(`ðŸŒ Allowed origins: ${getAllowedOrigins().join(', ')}`);

    // Initialize Socket.IO
    socketService.initialize(fastify.server);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nâ³ Shutting down gracefully...');
  try {
    await db.close();
    await fastify.close();
    console.log('âœ… Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('âŒ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

start();



