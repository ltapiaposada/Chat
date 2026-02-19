const cloudinary = require('cloudinary').v2;
const userRepository = require('../infrastructure/repositories/UserRepository');
const chatRepository = require('../infrastructure/repositories/ChatRepository');
const messageRepository = require('../infrastructure/repositories/MessageRepository');
const socketService = require('../infrastructure/websocket/socket');
const whatsappService = require('../services/whatsappService');

const DEFAULT_VERIFY_TOKEN = 'whatsapp_verify_2026';

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;
}

function extractTextMessage(message) {
  if (!message) return null;
  if (message.text && message.text.body) return message.text.body;
  if (message.button && message.button.text) return message.button.text;
  return null;
}

function isImageMime(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

function buildFilename(mediaType, mimeType) {
  const extension = mimeType?.split('/')[1] || 'bin';
  return `${mediaType}-${Date.now()}.${extension}`;
}

function getMessageContentForMedia(mediaType, caption) {
  if (caption) return caption;
  if (mediaType === 'audio') return 'Nota de audio';
  if (mediaType === 'document') return 'Adjunto';
  if (mediaType === 'image') return 'Imagen';
  return 'Adjunto';
}

function uploadToCloudinary(buffer, resourceType, filename) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'chat-storage',
        filename_override: filename,
        use_filename: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    upload.end(buffer);
  });
}

module.exports = async function whatsappRoutes(fastify) {
  const db = fastify.db || require('../infrastructure/database/postgres');
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
  });

  // Webhook verification (GET)
  fastify.get('/api/whatsapp/webhook', async (request, reply) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode === 'subscribe' && token === getVerifyToken()) {
      reply.header('Content-Type', 'text/plain');
      return reply.send(challenge);
    }

    return reply.status(403).send('Forbidden');
  });

  // Webhook receiver (POST)
  fastify.post('/api/whatsapp/webhook', async (request, reply) => {
    try {
      const body = request.body || {};
      const entries = body.entry || [];
      const io = socketService.getIO();

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const contacts = value.contacts || [];
          const messages = value.messages || [];
          const statuses = value.statuses || [];

          if (statuses.length > 0) {
            console.log(
              '📩 WhatsApp statuses received:',
              statuses.map(s => ({
                id: s.id,
                status: s.status,
                timestamp: s.timestamp,
                conversation: s.conversation?.id,
                recipientId: s.recipient_id,
                errors: s.errors ? JSON.stringify(s.errors) : undefined
              }))
            );
          }

          // Handle delivery/read statuses
          for (const status of statuses) {
            if (!status?.id) continue;
            const existing = await messageRepository.findByExternalMessageId(status.id);
            if (!existing) continue;
            const newStatus = status.status || 'sent';
            console.log(`✅ WhatsApp status update: ${existing.id} -> ${newStatus}`);
            await messageRepository.updateStatus(existing.id, newStatus);
            if (io && existing.chatId) {
              io.to(`user:${existing.userId}`).emit('message:status-updated', {
                chatId: existing.chatId,
                messageIds: [existing.id],
                status: newStatus
              });
            }
          }

          // Handle inbound messages
          for (const message of messages) {
            const waId = message.from;
            if (!waId) continue;

            const name = contacts[0]?.profile?.name || `WhatsApp ${waId}`;

            // Find or create user by WhatsApp ID
            let user = await userRepository.findByWhatsAppId(waId);
            if (!user) {
              user = await userRepository.create({
                name,
                role: 'client',
                whatsappId: waId
              });
            }

            // Find or create active WhatsApp chat
            let chat = await chatRepository.findActiveByClientIdAndChannel(user.id, 'whatsapp');
            let isNewChat = false;
            if (!chat) {
              chat = await chatRepository.create({
                clientId: user.id,
                subject: 'WhatsApp',
                channel: 'whatsapp'
              });
              isNewChat = true;
            }

            // Handle quoted messages (context)
            let replyToId = null;
            const contextId = message.context?.id;
            if (contextId) {
              const replied = await messageRepository.findByExternalMessageId(contextId);
              if (replied) {
                replyToId = replied.id;
              }
            }

            let saved = null;
            const text = extractTextMessage(message);
            if (text) {
              // Save text message
              saved = await messageRepository.create({
                chatId: chat.id,
                userId: user.id,
                content: text,
                senderRole: 'client',
                replyToId,
                channel: 'whatsapp',
                externalMessageId: message.id
              });
              console.log('📩 WhatsApp inbound saved', {
                savedId: saved?.id,
                externalMessageId: message.id,
                replyToId
              });
            } else if (message.type === 'image' || message.type === 'audio' || message.type === 'document') {
              const mediaPayload = message[message.type];
              if (!mediaPayload?.id) continue;

              const mediaInfo = await whatsappService.getMediaInfo(mediaPayload.id);
              const mediaBuffer = await whatsappService.downloadMedia(mediaInfo.url);
              const mimeType = mediaInfo.mime_type || mediaPayload.mime_type || 'application/octet-stream';
              const resourceType = isImageMime(mimeType) ? 'image' : 'raw';
              const filename = mediaPayload.filename || buildFilename(message.type, mimeType);
              const content = getMessageContentForMedia(message.type, mediaPayload.caption);

              // Create message first
              saved = await messageRepository.create({
                chatId: chat.id,
                userId: user.id,
                content,
                senderRole: 'client',
                replyToId,
                channel: 'whatsapp',
                externalMessageId: message.id
              });
              console.log('📩 WhatsApp inbound media saved', {
                savedId: saved?.id,
                externalMessageId: message.id,
                mediaType: message.type,
                replyToId
              });

              // Upload media to Cloudinary
              const uploadResult = await uploadToCloudinary(mediaBuffer, resourceType, filename);

              // Store attachment linked to message id
              await db.query(
                `INSERT INTO storage_chat 
                  (entity_id, entity_type, url, public_id, resource_type, is_attachment, mime_type, bytes, filename)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  saved.id,
                  'chat',
                  uploadResult.secure_url,
                  uploadResult.public_id,
                  resourceType,
                  resourceType !== 'image',
                  mimeType,
                  uploadResult.bytes,
                  filename
                ]
              );
            } else {
              continue;
            }

            // Notify agents if new pending chat
            if (isNewChat && io) {
              io.to('agents').emit('chat:new-pending', chat);
            }

            // If chat has assigned agent and agent online, mark delivered
            if (chat.agentId && io) {
              const agentSocket = socketService.agents?.get(chat.agentId);
              if (agentSocket) {
                await messageRepository.updateStatus(saved.id, 'delivered');
                saved.status = 'delivered';
              }
            }

            // Emit to agent and (if connected) to client room
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

      return reply.send({ status: 'ok' });
    } catch (error) {
      request.log.error({ err: error }, 'whatsapp webhook error');
      return reply.status(500).send({ error: 'Webhook error' });
    }
  });
};
