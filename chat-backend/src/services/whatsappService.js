const https = require('https');

/**
 * Extrae y valida la configuración necesaria para llamar a Meta.
 * @param {Object} connection - Conexión con credenciales descifradas.
 * @returns {Object} Token, teléfono y versión de Graph.
 * @throws {Error} Si faltan credenciales.
 */
function getConfig(connection) {
  if (!connection?.accessToken || !connection?.phoneNumberId) {
    throw new Error('WhatsApp connection is not configured');
  }
  return {
    accessToken: connection.accessToken,
    phoneNumberId: connection.phoneNumberId,
    graphVersion: connection.graphVersion || 'v19.0'
  };
}

/**
 * Ejecuta una solicitud HTTPS y procesa una respuesta JSON.
 * @param {Object} options - Método, host, ruta, cuerpo y encabezados.
 * @returns {Promise<Object>} Respuesta JSON exitosa.
 * @throws {Error} Si hay un error de red, formato o estado HTTP.
 */
function requestJson({ method, hostname, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname,
      path,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            const error = new Error(`WhatsApp API error: ${res.statusCode}`);
            error.response = json;
            reject(error);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Ejecuta una solicitud HTTPS conservando la respuesta binaria.
 * @param {Object} options - Método, host, ruta, cuerpo y encabezados.
 * @returns {Promise<{statusCode: number, body: Buffer}>} Respuesta sin procesar.
 */
function requestRaw({ method, hostname, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname,
      path,
      headers: {
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * Construye un cuerpo multipart para cargar archivos a Meta.
 * @param {Object} data - Campos y archivos de la solicitud.
 * @returns {{body: Buffer, boundary: string}} Cuerpo y delimitador multipart.
 */
function buildMultipartBody({ fields, files }) {
  const boundary = `----whatsapp-boundary-${Date.now()}`;
  const chunks = [];

  const push = (val) => {
    chunks.push(Buffer.isBuffer(val) ? val : Buffer.from(val));
  };

  for (const [key, value] of Object.entries(fields || {})) {
    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="${key}"\r\n\r\n`);
    push(String(value));
    push('\r\n');
  }

  for (const file of files || []) {
    push(`--${boundary}\r\n`);
    push(
      `Content-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\n`
    );
    if (file.contentType) {
      push(`Content-Type: ${file.contentType}\r\n`);
    }
    push('\r\n');
    push(file.data);
    push('\r\n');
  }

  push(`--${boundary}--\r\n`);
  return { body: Buffer.concat(chunks), boundary };
}

/**
 * Envía un mensaje de texto mediante WhatsApp Cloud API.
 * @param {Object} connection - Conexión con Meta.
 * @param {Object} message - Destinatario, texto y respuesta opcional.
 * @returns {Promise<string|null>} Identificador asignado por Meta.
 */
async function sendText(connection, { to, text, replyToMessageId }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig(connection);

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };

  if (replyToMessageId) {
    body.context = { message_id: replyToMessageId };
  }

  const response = await requestJson({
    method: 'POST',
    hostname: 'graph.facebook.com',
    path: `/${graphVersion}/${phoneNumberId}/messages`,
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response?.messages?.[0]?.id || null;
}

/**
 * Obtiene la URL temporal y metadatos de un archivo de WhatsApp.
 * @param {Object} connection - Conexión con Meta.
 * @param {string} mediaId - Identificador del archivo.
 * @returns {Promise<Object>} Metadatos entregados por Meta.
 */
async function getMediaInfo(connection, mediaId) {
  const { accessToken, graphVersion } = getConfig(connection);
  const response = await requestJson({
    method: 'GET',
    hostname: 'graph.facebook.com',
    path: `/${graphVersion}/${mediaId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return response;
}

/**
 * Descarga un archivo protegido desde una URL autorizada de Meta.
 * @param {Object} connection - Conexión con Meta.
 * @param {string} url - URL temporal del archivo.
 * @returns {Promise<Buffer>} Contenido binario.
 */
function downloadMedia(connection, url) {
  const { accessToken } = getConfig(connection);
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    };
    https
      .request(url, options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(Buffer.concat(chunks));
          } else {
            reject(new Error(`Media download failed: ${res.statusCode}`));
          }
        });
      })
      .on('error', reject)
      .end();
  });
}

/**
 * Envía un archivo remoto mediante WhatsApp Cloud API.
 * @param {Object} connection - Conexión con Meta.
 * @param {Object} message - Destinatario, tipo, URL y metadatos.
 * @returns {Promise<string|null>} Identificador asignado por Meta.
 */
async function sendMedia(connection, { to, type, url, caption, filename, replyToMessageId }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig(connection);

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type
  };

  if (type === 'image') {
    payload.image = { link: url };
    if (caption) payload.image.caption = caption;
  } else if (type === 'audio') {
    payload.audio = { link: url };
  } else if (type === 'document') {
    payload.document = { link: url };
    if (filename) payload.document.filename = filename;
  } else {
    throw new Error(`Unsupported media type: ${type}`);
  }

  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }

  const response = await requestJson({
    method: 'POST',
    hostname: 'graph.facebook.com',
    path: `/${graphVersion}/${phoneNumberId}/messages`,
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response?.messages?.[0]?.id || null;
}

/**
 * Carga un archivo binario al almacenamiento temporal de WhatsApp.
 * @param {Object} connection - Conexión con Meta.
 * @param {Object} file - Contenido, tipo MIME y nombre.
 * @returns {Promise<string>} Identificador del archivo cargado.
 */
async function uploadMedia(connection, { buffer, mimeType, filename }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig(connection);

  const fields = {
    messaging_product: 'whatsapp',
    type: mimeType || 'application/octet-stream'
  };

  const { body, boundary } = buildMultipartBody({
    fields,
    files: [
      {
        field: 'file',
        filename: filename || 'media',
        contentType: mimeType || 'application/octet-stream',
        data: buffer
      }
    ]
  });

  const response = await requestRaw({
    method: 'POST',
    hostname: 'graph.facebook.com',
    path: `/${graphVersion}/${phoneNumberId}/media`,
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }
  });

  let json = {};
  try {
    json = response.body?.length ? JSON.parse(response.body.toString('utf8')) : {};
  } catch (err) {
    throw new Error('WhatsApp media upload: invalid JSON response');
  }

  if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
    return json?.id || null;
  }

  const error = new Error(`WhatsApp media upload error: ${response.statusCode}`);
  error.response = json;
  throw error;
}

/**
 * Envía audio previamente cargado, opcionalmente como nota de voz.
 * @param {Object} connection - Conexión con Meta.
 * @param {Object} message - Destinatario, archivo y contexto.
 * @returns {Promise<string|null>} Identificador asignado por Meta.
 */
async function sendAudioById(connection, { to, mediaId, replyToMessageId, voice }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig(connection);
  if (!mediaId) {
    throw new Error('mediaId is required to send audio by id');
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'audio',
    audio: {
      id: mediaId,
      ...(voice ? { voice: true } : {})
    }
  };

  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }

  const response = await requestJson({
    method: 'POST',
    hostname: 'graph.facebook.com',
    path: `/${graphVersion}/${phoneNumberId}/messages`,
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response?.messages?.[0]?.id || null;
}

/**
 * Envía una plantilla aprobada fuera de la ventana de atención.
 * @param {Object} connection - Conexión con Meta.
 * @param {Object} message - Destinatario, plantilla, idioma y componentes.
 * @returns {Promise<string|null>} Identificador asignado por Meta.
 */
async function sendTemplate(connection, { to, name, languageCode, components }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig(connection);
  if (!name || !languageCode) {
    throw new Error('Template name and languageCode are required');
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name,
      language: { code: languageCode }
    }
  };

  if (components && Array.isArray(components) && components.length > 0) {
    payload.template.components = components;
  }

  const response = await requestJson({
    method: 'POST',
    hostname: 'graph.facebook.com',
    path: `/${graphVersion}/${phoneNumberId}/messages`,
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response?.messages?.[0]?.id || null;
}

module.exports = {
  sendText,
  sendMedia,
  uploadMedia,
  sendAudioById,
  sendTemplate,
  getMediaInfo,
  downloadMedia
};
