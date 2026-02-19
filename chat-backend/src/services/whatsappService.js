const https = require('https');

function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION || 'v19.0'
  };
}

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

async function sendText({ to, text, replyToMessageId }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing');
  }

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

async function getMediaInfo(mediaId) {
  const { accessToken, graphVersion } = getConfig();
  if (!accessToken) {
    throw new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN missing');
  }
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

function downloadMedia(url) {
  const { accessToken } = getConfig();
  if (!accessToken) {
    throw new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN missing');
  }
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

async function sendMedia({ to, type, url, caption, filename, replyToMessageId }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing');
  }

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

async function uploadMedia({ buffer, mimeType, filename }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing');
  }

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

async function sendAudioById({ to, mediaId, replyToMessageId, voice }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing');
  }
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

async function sendTemplate({ to, name, languageCode, components }) {
  const { accessToken, phoneNumberId, graphVersion } = getConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp not configured: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing');
  }
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
