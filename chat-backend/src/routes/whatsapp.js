const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const userRepository = require('../infrastructure/repositories/UserRepository');
const chatRepository = require('../infrastructure/repositories/ChatRepository');
const messageRepository = require('../infrastructure/repositories/MessageRepository');
const connectionRepository = require('../infrastructure/repositories/WhatsAppConnectionRepository');
const socketService = require('../infrastructure/websocket/socket');
const { providerFor } = require('../services/whatsappProvider');
const { createRateLimit } = require('../plugins/rateLimit');

const webhookVerificationRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 60,
  errorMessage: 'Too many webhook verification requests'
});

const webhookReceiveRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 180,
  errorMessage: 'Too many webhook requests'
});

/**
 * Compara dos cadenas de forma segura contra ataques de timing.
 * @param {string} left - Primera cadena a comparar.
 * @param {string} right - Segunda cadena a comparar.
 * @returns {boolean} true si ambas cadenas son idénticas.
 */
function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Valida la firma HMAC SHA-256 de Meta (X-Hub-Signature-256) usando el app secret.
 * @param {Buffer} rawBody - Cuerpo de la solicitud en bytes.
 * @param {string} signature - Firma enviada por Meta.
 * @param {string} appSecret - Clave secreta de la aplicación de la conexión.
 * @returns {boolean} true si la firma es válida.
 */
function validSignature(rawBody, signature, appSecret) {
  if (!Buffer.isBuffer(rawBody) || !signature || !appSecret) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return safeEqual(expected, signature);
}

/**
 * Extrae el contenido de texto de un mensaje de WhatsApp.
 * @param {Object} message - Mensaje entrante de WhatsApp.
 * @returns {string|null} Texto del mensaje o null si no tiene texto/botón.
 */
function extractTextMessage(message) {
  return message?.text?.body || message?.button?.text || null;
}

/**
 * Construye un nombre de archivo con el tipo de medio y una marca de tiempo.
 * @param {string} mediaType - Tipo de medio (image, audio, document).
 * @param {string} mimeType - Tipo MIME del archivo.
 * @returns {string} Nombre de archivo generado.
 */
function buildFilename(mediaType, mimeType) {
  return `${mediaType}-${Date.now()}.${mimeType?.split('/')[1] || 'bin'}`;
}

/**
 * Devuelve el texto de contenido de un mensaje multimedia, usando una etiqueta por defecto si no hay caption.
 * @param {string} mediaType - Tipo de medio (audio, document, image).
 * @param {string} caption - Caption del medio si existe.
 * @returns {string} Contenido de texto del mensaje.
 */
function mediaContent(mediaType, caption) {
  if (caption) return caption;
  return { audio: 'Nota de audio', document: 'Adjunto', image: 'Imagen' }[mediaType] || 'Adjunto';
}

/**
 * Sube un buffer a Cloudinary usando streaming.
 * @param {Buffer} buffer - Contenido del archivo a subir.
 * @param {string} resourceType - Tipo de recurso ('image', 'raw', etc.).
 * @param {string} filename - Nombre de archivo para sobrescribir en Cloudinary.
 * @returns {Promise<Object>} Resultado del upload de Cloudinary.
 */
function uploadToCloudinary(buffer, resourceType, filename) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream({
      resource_type: resourceType,
      folder: 'chat-storage',
      filename_override: filename,
      use_filename: true
    }, (error, result) => error ? reject(error) : resolve(result));
    upload.end(buffer);
  });
}

/**
 * Guarda un mensaje entrante de WhatsApp: crea el mensaje de texto o descarga/guarda el medio en Cloudinary.
 * @param {Object} params - Parámetros del mensaje.
 * @param {Object} params.message - Mensaje entrante de WhatsApp.
 * @param {Object} params.connection - Conexión de WhatsApp activa.
 * @param {Object} params.chat - Chat asociado al mensaje.
 * @param {Object} params.user - Usuario (cliente) que envió el mensaje.
 * @param {number|null} params.replyToId - ID del mensaje respondido, si aplica.
 * @param {Object} params.db - Conexión a la base de datos.
 * @returns {Promise<Object|null>} Mensaje guardado o null si no se pudo procesar.
 */
async function saveInboundMessage({ message, connection, chat, user, replyToId, db }) {
  const whatsappService = providerFor(connection);
  const common = {
    chatId: chat.id,
    userId: user.id,
    senderRole: 'client',
    replyToId,
    channel: 'whatsapp',
    externalMessageId: message.id,
    whatsappConnectionId: connection.id
  };
  const text = extractTextMessage(message);
  if (text) return messageRepository.create({ ...common, content: text });

  if (!['image', 'audio', 'document'].includes(message.type)) return null;
  const mediaPayload = message[message.type];
  if (!mediaPayload?.id) return null;
  const mediaInfo = await whatsappService.getMediaInfo(connection, mediaPayload.id);
  const mediaBuffer = await whatsappService.downloadMedia(connection, mediaInfo.url);
  const mimeType = mediaInfo.mime_type || mediaPayload.mime_type || 'application/octet-stream';
  const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
  const filename = mediaPayload.filename || buildFilename(message.type, mimeType);
  const saved = await messageRepository.create({
    ...common,
    content: mediaContent(message.type, mediaPayload.caption)
  });
  const uploadResult = await uploadToCloudinary(mediaBuffer, resourceType, filename);
  await db.query(
    `INSERT INTO storage_chat
      (entity_id, entity_type, url, public_id, resource_type, is_attachment, mime_type, bytes, filename)
     VALUES ($1, 'chat', $2, $3, $4, $5, $6, $7, $8)`,
    [saved.id, uploadResult.secure_url, uploadResult.public_id, resourceType,
      resourceType !== 'image', mimeType, uploadResult.bytes, filename]
  );
  return saved;
}

/**
 * Registra las rutas del webhook de WhatsApp.
 * Configura un content type parser en modo buffer para validar la firma de Meta.
 * Incluye la verificación del webhook (GET) y la recepción de eventos (POST).
 * @param {Object} fastify - Instancia de Fastify.
 * @returns {Promise<void>}
 */
module.exports = async function whatsappRoutes(fastify) {
  const db = fastify.db || require('../infrastructure/database/postgres');
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

  // Los bytes exactos son requeridos para validar el X-Hub-Signature-256 de Meta.
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (request, body, done) => {
    request.rawBody = body;
    try {
      done(null, JSON.parse(body.toString('utf8')));
    } catch (error) {
      error.statusCode = 400;
      done(error);
    }
  });

  // GET /api/whatsapp/webhook/:webhookKey — Verificación del webhook de Meta (hub.challenge). Rate limit: 60/min por IP. Respuesta: el challenge si el token es válido, 403 en caso contrario.
  fastify.get('/api/whatsapp/webhook/:webhookKey', {
    preHandler: webhookVerificationRateLimit
  }, async (request, reply) => {
    const connection = await connectionRepository.findByWebhookKey(request.params.webhookKey, true);
    if (connection && request.query['hub.mode'] === 'subscribe' &&
        safeEqual(request.query['hub.verify_token'], connection.verifyToken)) {
      reply.header('Content-Type', 'text/plain');
      return reply.send(request.query['hub.challenge']);
    }
    return reply.status(403).send('Forbidden');
  });

  // POST /api/whatsapp/webhook/:webhookKey — Recibe eventos de WhatsApp de Meta. Rate limit: 180/min por IP. Valida firma HMAC. Efectos: crea/actualiza usuarios, chats y mensajes, emite eventos por websocket (message:new, chat:new-pending, message:status-updated, chat:unread-updated), guarda medios en Cloudinary.
  fastify.post('/api/whatsapp/webhook/:webhookKey', {
    preHandler: webhookReceiveRateLimit
  }, async (request, reply) => {
    const connection = await connectionRepository.findByWebhookKey(request.params.webhookKey, true);
    if (!connection || connection.status !== 'active') return reply.status(404).send({ error: 'Not found' });
    const signature = request.headers['x-hub-signature-256'];
    if (!validSignature(request.rawBody, signature, connection.appSecret)) {
      const reason = signature
        ? 'Meta contactó el webhook, pero la firma no coincide. Verifica la Clave secreta de la aplicación.'
        : 'Meta contactó el webhook sin una firma de seguridad.';
      await connectionRepository.touchWebhook(connection.id, reason).catch(() => {});
      request.log.warn({
        connectionId: connection.id,
        hasSignature: Boolean(signature),
        rawBodyBytes: request.rawBody?.length || 0
      }, 'whatsapp webhook signature rejected');
      return reply.status(401).send({ error: 'Invalid webhook signature' });
    }

    try {
      const io = socketService.getIO();
      for (const entry of request.body?.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};
          if (String(value.metadata?.phone_number_id || '') !== String(connection.phoneNumberId)) {
            request.log.warn({ connectionId: connection.id }, 'whatsapp phone_number_id mismatch');
            continue;
          }

          for (const status of value.statuses || []) {
            if (!status?.id || !['sent', 'delivered', 'read', 'failed'].includes(status.status)) continue;
            const existing = await messageRepository.findByExternalMessageId(status.id, connection.id);
            if (!existing) continue;
            const updated = await messageRepository.updateStatus(existing.id, status.status);
            if (updated && io && existing.chatId) {
              io.to(`user:${existing.userId}`).emit('message:status-updated', {
                chatId: existing.chatId,
                messageIds: [existing.id],
                status: updated.status
              });
            }
          }

          for (const message of value.messages || []) {
            if (!message?.id || !message.from) continue;
            if (await messageRepository.findByExternalMessageId(message.id, connection.id)) continue;

            const user = await userRepository.findOrCreateWhatsApp({
              name: value.contacts?.[0]?.profile?.name || `WhatsApp ${message.from}`,
              whatsappId: message.from,
              companyId: connection.companyId,
              channelId: connection.channelId
            });

            let chat = await chatRepository.findActiveByClientIdAndChannel(
              user.id,
              'whatsapp',
              connection.companyId,
              connection.channelId
            );
            let isNewChat = false;
            if (!chat) {
              chat = await chatRepository.create({
                clientId: user.id,
                companyId: connection.companyId,
                channelId: connection.channelId,
                subject: `WhatsApp ${connection.displayPhoneNumber || ''}`.trim(),
                channel: 'whatsapp'
              });
              isNewChat = true;
            }

            let replyToId = null;
            if (message.context?.id) {
              const replied = await messageRepository.findByExternalMessageId(message.context.id, connection.id);
              replyToId = replied?.chatId === chat.id ? replied.id : null;
            }

            let saved;
            try {
              saved = await saveInboundMessage({ message, connection, chat, user, replyToId, db });
            } catch (error) {
              if (error.code === '23505') continue;
              throw error;
            }
            if (!saved) continue;
            await chatRepository.touchCustomerMessage(chat.id, connection.companyId);

            if (!chat.agentId && io) {
              const pendingChat = await chatRepository.findById(chat.id, connection.companyId);
              io.to(`agents:${connection.companyId}:channel:${connection.channelId}`)
                .emit('chat:new-pending', pendingChat);
            }
            if (chat.agentId && io && socketService.agents?.get(chat.agentId)) {
              await messageRepository.updateStatus(saved.id, 'delivered');
              saved.status = 'delivered';
            }
            if (io) {
              if (chat.agentId) {
                io.to(`user:${chat.agentId}`).emit('message:new', saved);
                const unreadCount = await messageRepository.getUnreadCount(chat.id, chat.agentId);
                io.to(`user:${chat.agentId}`).emit('chat:unread-updated', { chatId: chat.id, unreadCount });
              }
              io.to(`user:${user.id}`).emit('message:new', saved);
            }
          }
        }
      }
      await connectionRepository.touchWebhook(connection.id);
      return reply.send({ status: 'ok' });
    } catch (error) {
      await connectionRepository.touchWebhook(connection.id, error.message).catch(() => {});
      request.log.error({ err: error, connectionId: connection.id }, 'whatsapp webhook error');
      return reply.status(500).send({ error: 'Webhook error' });
    }
  });
};

module.exports.validSignature = validSignature;
