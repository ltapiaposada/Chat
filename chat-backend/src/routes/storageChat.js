const cloudinary = require('cloudinary').v2;
const https = require('https');
const { URL } = require('url');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const messageRepository = require('../infrastructure/repositories/MessageRepository');
const chatRepository = require('../infrastructure/repositories/ChatRepository');
const userRepository = require('../infrastructure/repositories/UserRepository');
const whatsappService = require('../services/whatsappService');
const socketService = require('../infrastructure/websocket/socket');

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);

const ALLOWED_FILE_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/mp4',
  'audio/aac'
]);

const WHATSAPP_AUDIO_MIME = new Set([
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav'
]);

function isImage(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

function isAllowedMime(mimeType) {
  if (isImage(mimeType)) return ALLOWED_IMAGE_MIME.has(mimeType);
  return ALLOWED_FILE_MIME.has(mimeType);
}

function getResourceType(mimeType, options = {}) {
  if (isImage(mimeType)) return 'image';
  if (mimeType && mimeType.startsWith('audio/')) {
    if (options.forceRawAudio) return 'raw';
    return 'video';
  }
  return 'raw';
}

function isWebmAudio(mimeType) {
  return !!mimeType && mimeType.startsWith('audio/webm');
}

function safeReplaceExtension(filename, nextExt) {
  if (!filename) return `audio-${Date.now()}.${nextExt}`;
  const ext = path.extname(filename);
  if (!ext) return `${filename}.${nextExt}`;
  return filename.slice(0, -ext.length) + `.${nextExt}`;
}

let cachedFfmpegPath = null;

function resolveFfmpegPath() {
  if (cachedFfmpegPath) return cachedFfmpegPath;
  if (process.env.FFMPEG_PATH) {
    cachedFfmpegPath = process.env.FFMPEG_PATH;
    return cachedFfmpegPath;
  }

  const candidates = [
    'C:\\\\Program Files\\\\FFmpeg\\\\bin\\\\ffmpeg.exe',
    'C:\\\\Program Files\\\\ffmpeg\\\\bin\\\\ffmpeg.exe',
    'C:\\\\Program Files\\\\Gyan\\\\FFmpeg\\\\bin\\\\ffmpeg.exe',
    'C:\\\\ffmpeg\\\\bin\\\\ffmpeg.exe'
  ];

  const pathEnv = process.env.PATH || '';
  for (const part of pathEnv.split(path.delimiter)) {
    const maybe = path.join(part, 'ffmpeg.exe');
    if (fs.existsSync(maybe)) {
      cachedFfmpegPath = maybe;
      return cachedFfmpegPath;
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedFfmpegPath = candidate;
      return cachedFfmpegPath;
    }
  }

  const winGetBase = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages')
    : null;
  if (winGetBase && fs.existsSync(winGetBase)) {
    try {
      const packages = fs.readdirSync(winGetBase, { withFileTypes: true });
      for (const pkg of packages) {
        if (!pkg.isDirectory()) continue;
        if (!pkg.name.toLowerCase().startsWith('gyan.ffmpeg')) continue;
        const pkgRoot = path.join(winGetBase, pkg.name);
        const builds = fs.readdirSync(pkgRoot, { withFileTypes: true });
        for (const build of builds) {
          if (!build.isDirectory()) continue;
          const maybe = path.join(pkgRoot, build.name, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(maybe)) {
            cachedFfmpegPath = maybe;
            return cachedFfmpegPath;
          }
        }
      }
    } catch (err) {
      // ignore and fall through
    }
  }

  return null;
}

function runFfmpeg(args) {
  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath) {
    throw new Error('ffmpeg not found; set FFMPEG_PATH or install ffmpeg in PATH');
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      return reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(0, 2000)}`));
    });
  });
}

async function transcodeWebmToOgg(buffer) {
  let tmpDir = null;
  try {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'chat-audio-'));
    const inputPath = path.join(tmpDir, 'input.webm');
    const outputPath = path.join(tmpDir, 'output.ogg');
    await fs.promises.writeFile(inputPath, buffer);
    await runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-c:a',
      'libopus',
      '-b:a',
      '32k',
      '-vbr',
      'on',
      '-compression_level',
      '10',
      outputPath
    ]);
    return await fs.promises.readFile(outputPath);
  } finally {
    if (tmpDir) {
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        // Best-effort cleanup
      }
    }
  }
}

function buildPublicMediaUrl(uploadResult, resourceType, filename, mimeType) {
  if (resourceType === 'image') {
    return uploadResult.secure_url;
  }

  // WhatsApp voice notes require an inline, streamable URL (no attachment disposition).
  // Cloudinary private_download_url forces attachment, which makes WhatsApp treat it as a document.
  if (mimeType && mimeType.startsWith('audio/')) {
    return uploadResult.secure_url;
  }

  const ext = filename ? path.extname(filename).replace('.', '') : '';
  // Use signed URL for non-image files to avoid private delivery issues
  return cloudinary.utils.private_download_url(uploadResult.public_id, ext || null, {
    resource_type: resourceType,
    type: 'upload'
  });
}

function uploadToCloudinary(buffer, resourceType, filename, options = {}) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'chat-storage',
        filename_override: filename,
        use_filename: true,
        ...(options || {})
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    upload.end(buffer);
  });
}

function fetchBuffer(fileUrl) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(fileUrl);
    const options = {
      method: 'GET',
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`Download failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = async function storageChatRoutes(fastify) {
  const db = fastify.db || require('../infrastructure/database/postgres');

  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
  });

  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1
    }
  });

  // Ensure entity_type column exists for multi-entity attachments
  await db.query(
    `ALTER TABLE storage_chat 
     ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) NOT NULL DEFAULT 'chat'`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_storage_chat_entity_type_id 
     ON storage_chat(entity_type, entity_id)`
  );

  fastify.post('/api/storage-chat/upload', async (request, reply) => {
    try {
      if (!process.env.CLOUDINARY_URL) {
        return reply.status(500).send({ error: 'Storage no configurado' });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'Archivo requerido' });
      }

      const entityId = data.fields?.entity_id?.value || data.fields?.entity_id;
      const entityType = data.fields?.entity_type?.value || data.fields?.entity_type || 'chat';
      if (!entityId) {
        return reply.status(400).send({ error: 'entity_id requerido' });
      }

      if (!isAllowedMime(data.mimetype)) {
        return reply.status(415).send({ error: 'Tipo de archivo no permitido' });
      }

      if (data.file && data.file.truncated) {
        return reply.status(413).send({ error: 'Archivo demasiado grande' });
      }

      let buffer = await data.toBuffer();
      let filename = data.filename;
      let mimeType = data.mimetype;
      let isWhatsAppAgentAttachment = false;
      let preferCloudinaryTranscode = false;
      let message = null;
      let chat = null;

      if (entityType === 'chat') {
        message = await messageRepository.findById(Number(entityId));
        if (message) {
          chat = await chatRepository.findById(message.chatId);
          if (chat && chat.channel === 'whatsapp' && message.senderRole === 'agent') {
            isWhatsAppAgentAttachment = true;
          }
        }
      }

      const isWhatsAppAudio =
        isWhatsAppAgentAttachment && !!mimeType && mimeType.startsWith('audio/');

      if (isWhatsAppAudio && !WHATSAPP_AUDIO_MIME.has(mimeType)) {
        try {
          request.log.info({ mimeType, filename }, 'whatsapp audio: transcoding webm -> ogg');
          const oggBuffer = await transcodeWebmToOgg(buffer);
          buffer = oggBuffer;
          mimeType = 'audio/ogg';
          filename = safeReplaceExtension(filename, 'ogg');
          request.log.info({ mimeType, filename }, 'whatsapp audio: transcode ok');
        } catch (transcodeErr) {
          // If ffmpeg is not available, fall back to Cloudinary transcode.
          preferCloudinaryTranscode = true;
          request.log.error({ err: transcodeErr }, 'audio transcode failed, fallback to Cloudinary');
        }
      }

      let uploadResourceType = getResourceType(mimeType, {
        forceRawAudio: isWhatsAppAudio && !preferCloudinaryTranscode
      });

      let desiredFilename = filename;
      let desiredMimeType = mimeType;
      let cloudinaryOptions = {};
      if (isWhatsAppAudio && preferCloudinaryTranscode) {
        uploadResourceType = 'video';
        desiredFilename = safeReplaceExtension(filename, 'ogg');
        desiredMimeType = 'audio/ogg';
        cloudinaryOptions = {
          eager: [{ format: 'ogg', audio_codec: 'opus' }],
          eager_async: false
        };
      }

      const resourceType = uploadResourceType;
      const isAttachment = resourceType !== 'image';

      const uploadResult = await uploadToCloudinary(
        buffer,
        resourceType,
        desiredFilename,
        cloudinaryOptions
      );

      let storedUrl = uploadResult.secure_url;
      let storedMimeType = mimeType;
      let storedFilename = filename;
      if (isWhatsAppAudio && preferCloudinaryTranscode) {
        const eagerUrl = uploadResult?.eager?.[0]?.secure_url;
        if (eagerUrl) {
          storedUrl = eagerUrl;
          storedMimeType = desiredMimeType;
          storedFilename = desiredFilename;
        } else if (uploadResult?.public_id) {
          // Fallback to on-the-fly derived ogg URL
          storedUrl = cloudinary.url(uploadResult.public_id, {
            resource_type: 'video',
            format: 'ogg',
            secure: true
          });
          storedMimeType = desiredMimeType;
          storedFilename = desiredFilename;
        }
      }

      const insert = await db.query(
        `INSERT INTO storage_chat 
          (entity_id, entity_type, url, public_id, resource_type, is_attachment, mime_type, bytes, filename)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, entity_id, url, public_id, resource_type, mime_type, bytes, filename, is_attachment, created_at`,
        [
          entityId,
          entityType,
          storedUrl,
          uploadResult.public_id,
          resourceType,
          isAttachment,
          storedMimeType,
          uploadResult.bytes,
          storedFilename
        ]
      );

      const effectiveMimeType = storedMimeType || mimeType;

      // Notify participants so they can refresh attachments in real time
      const io = socketService.getIO();
      if (io && entityType === 'chat' && message && chat) {
        const payload = { entityId: Number(entityId), entityType: 'chat' };
        io.to(`user:${chat.clientId}`).emit('attachments:updated', payload);
        if (chat.agentId) {
          io.to(`user:${chat.agentId}`).emit('attachments:updated', payload);
        }
      }

      // If this attachment belongs to a WhatsApp chat message, forward it to WhatsApp
      if (entityType === 'chat' && isWhatsAppAgentAttachment && message && chat) {
        const client = await userRepository.findById(chat.clientId);
        if (client?.whatsapp_id) {
          const replyExternalId = message.replyToId
            ? (await messageRepository.findById(message.replyToId))?.externalMessageId
            : null;
          let mediaType = 'document';
          if (effectiveMimeType?.startsWith('image/')) {
            mediaType = 'image';
          } else if (effectiveMimeType?.startsWith('audio/')) {
            mediaType = 'audio';
          }

          try {
            request.log.info(
              {
                mimeType,
                storedMimeType,
                effectiveMimeType,
                resourceType,
                filename,
                mediaType,
                replyToId: message.replyToId || null,
                replyExternalId: replyExternalId || null
              },
              'whatsapp media send'
            );
            const captionTextRaw = String(message.content || '').trim();
            const isPlaceholder =
              captionTextRaw === 'Nota de audio' ||
              captionTextRaw === 'Nota de voz' ||
              captionTextRaw === 'Adjunto';
            const captionText = isPlaceholder ? '' : captionTextRaw;
            if (mediaType === 'audio' && storedUrl) {
              try {
                // If there's text, send it as a separate message (replying if needed),
                // then send the voice note. This matches the requested UX.
                if (captionText) {
                  const textExternalId = await whatsappService.sendText({
                    to: client.whatsapp_id,
                    text: captionText,
                    replyToMessageId: replyExternalId || null
                  });
                  if (textExternalId) {
                    await messageRepository.updateExternalMessageId(message.id, textExternalId);
                  }
                } else if (replyExternalId) {
                  const textExternalId = await whatsappService.sendText({
                    to: client.whatsapp_id,
                    text: 'Nota de audio',
                    replyToMessageId: replyExternalId
                  });
                  if (textExternalId) {
                    await messageRepository.updateExternalMessageId(message.id, textExternalId);
                  }
                }

                request.log.info(
                  { url: storedUrl, mimeType: storedMimeType, filename: storedFilename },
                  'whatsapp audio: downloading from storage'
                );
                const audioBuffer = await fetchBuffer(storedUrl);
                const waMimeType =
                  storedMimeType === 'audio/ogg' ? 'audio/ogg; codecs=opus' : storedMimeType;
                request.log.info(
                  { bytes: audioBuffer.length, mimeType: waMimeType },
                  'whatsapp audio: uploading to media endpoint'
                );
                const mediaId = await whatsappService.uploadMedia({
                  buffer: audioBuffer,
                  mimeType: waMimeType,
                  filename: storedFilename
                });
                if (mediaId) {
                  request.log.info({ mediaId }, 'whatsapp audio: media uploaded');
                  const externalId = await whatsappService.sendAudioById({
                    to: client.whatsapp_id,
                    mediaId,
                    replyToMessageId: null,
                    voice: true
                  });
                  if (externalId) {
                    await messageRepository.updateExternalMessageId(message.id, externalId);
                  }
                  request.log.info({ mediaId }, 'whatsapp audio: sent by id');
                } else {
                  throw new Error('WhatsApp media upload failed (no id)');
                }
              } catch (audioErr) {
                request.log.error(
                  { err: audioErr, response: audioErr?.response },
                  'whatsapp audio upload failed, fallback to link'
                );
                const waUrl = buildPublicMediaUrl(uploadResult, resourceType, filename, mimeType);
                const externalId = await whatsappService.sendMedia({
                  to: client.whatsapp_id,
                  type: mediaType,
                  url: waUrl,
                  filename: storedFilename,
                  replyToMessageId: null
                });
                if (externalId) {
                  await messageRepository.updateExternalMessageId(message.id, externalId);
                }
              }
            } else {
              const waUrl = buildPublicMediaUrl(uploadResult, resourceType, filename, mimeType);
              const externalId = await whatsappService.sendMedia({
                to: client.whatsapp_id,
                type: mediaType,
                url: waUrl,
                filename: storedFilename,
                caption: captionText || undefined,
                replyToMessageId: replyExternalId || null
              });
              if (externalId) {
                await messageRepository.updateExternalMessageId(message.id, externalId);
              }
            }
          } catch (waError) {
            request.log.error(
              { err: waError, response: waError?.response },
              'whatsapp media send error'
            );
          }
        }
      }

      return reply.send(insert.rows[0]);
    } catch (error) {
      request.log.error({ err: error }, 'storage-chat upload error');
      return reply.status(500).send({ error: 'Error al subir archivo' });
    }
  });

  fastify.get('/api/storage-chat/:entity_id', async (request, reply) => {
    try {
      const { entity_id: entityId } = request.params;
      const entityType = request.query?.entity_type || 'chat';
      const result = await db.query(
        `SELECT id, entity_id, url, public_id, resource_type, mime_type, bytes, filename, is_attachment, created_at
         FROM storage_chat
         WHERE entity_id = $1 AND entity_type = $2
         ORDER BY created_at ASC`,
        [entityId, entityType]
      );
      return reply.send(result.rows);
    } catch (error) {
      request.log.error({ err: error }, 'storage-chat list error');
      return reply.status(500).send({ error: 'Error al listar adjuntos' });
    }
  });

  fastify.get('/api/storage-chat/download/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await db.query(
        `SELECT id, url, mime_type, filename, public_id, resource_type 
         FROM storage_chat 
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Adjunto no encontrado' });
      }

      const file = result.rows[0];
      let buffer = null;
      try {
        buffer = await fetchBuffer(file.url);
      } catch (err) {
        // If Cloudinary requires auth (401), generate a signed URL and retry
        if (String(err.message || '').includes('401') && file.public_id) {
          const ext = file.filename ? path.extname(file.filename).replace('.', '') : '';
          const signedUrl = cloudinary.utils.private_download_url(
            file.public_id,
            ext || null,
            {
              resource_type: file.resource_type || 'raw',
              type: 'upload'
            }
          );
          buffer = await fetchBuffer(signedUrl);
        } else {
          throw err;
        }
      }
      const contentType = file.mime_type || 'application/octet-stream';
      const filename = file.filename || 'archivo';

      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.send(buffer);
    } catch (error) {
      request.log.error({ err: error }, 'storage-chat download error');
      return reply.status(500).send({ error: 'Error al descargar adjunto' });
    }
  });

  fastify.delete('/api/storage-chat/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await db.query(
        `SELECT id, public_id, resource_type 
         FROM storage_chat 
         WHERE id = $1`,
        [id]
      );

      if (existing.rows.length === 0) {
        return reply.status(404).send({ error: 'Adjunto no encontrado' });
      }

      const { public_id: publicId, resource_type: resourceType } = existing.rows[0];

      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

      await db.query(`DELETE FROM storage_chat WHERE id = $1`, [id]);

      return reply.send({ success: true });
    } catch (error) {
      request.log.error({ err: error }, 'storage-chat delete error');
      return reply.status(500).send({ error: 'Error al eliminar adjunto' });
    }
  });

  // Quick phrases (per user)
  fastify.get('/api/quick-phrases', async (request, reply) => {
    try {
      const result = await db.query(
        `SELECT id, label, text
         FROM quick_phrases
         ORDER BY label ASC`,
        []
      )
      return reply.send(result.rows)
    } catch (error) {
      request.log.error({ err: error }, 'quick-phrases list error')
      return reply.status(500).send({ error: 'Error al listar frases' })
    }
  })

  fastify.post('/api/quick-phrases', async (request, reply) => {
    try {
      const { label, text } = request.body || {}
      const normalizedLabel = typeof label === 'string' ? label.trim() : ''
      const phraseText = typeof text === 'string' ? text.trim() : ''
      if (!normalizedLabel || !phraseText) {
        return reply.status(400).send({ error: 'label y text requeridos' })
      }

      const result = await db.query(
        `INSERT INTO quick_phrases (label, text)
         VALUES ($1, $2)
         ON CONFLICT (label)
         DO UPDATE SET text = EXCLUDED.text, updated_at = CURRENT_TIMESTAMP
         RETURNING id, label, text`,
        [normalizedLabel, phraseText]
      )
      return reply.send(result.rows[0])
    } catch (error) {
      request.log.error({ err: error }, 'quick-phrases upsert error')
      return reply.status(500).send({ error: 'Error al guardar frase' })
    }
  })
};
