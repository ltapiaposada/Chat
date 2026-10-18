const { spawn } = require('child_process');
const http = require('http');

let tunnelProcess = null;
let tunnelUrl = null;
let starting = null;
let webhookProxy = null;

/** @param {string} value - URL candidata. @returns {string|null} Origen HTTPS normalizado. */
function normalizePublicUrl(value) {
  const candidate = String(value || '').trim().replace(/\/$/, '');
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' ? parsed.origin : null;
  } catch (_) {
    return null;
  }
}

/** @param {string} output - Salida de Cloudflare Tunnel. @returns {string|null} URL pública encontrada. */
function extractTunnelUrl(output) {
  return String(output || '').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)?.[0] || null;
}

/** @returns {string|null} URL pública activa para construir webhooks. */
function getPublicUrl() {
  return normalizePublicUrl(process.env.PUBLIC_API_URL) || tunnelUrl;
}

/**
 * Limita el proxy local a solicitudes válidas del webhook de WhatsApp.
 * @param {string} method - Método HTTP.
 * @param {string} requestUrl - Ruta solicitada.
 * @returns {boolean} Decisión de acceso.
 */
function isAllowedWebhookRequest(method, requestUrl) {
  const pathname = String(requestUrl || '').split('?')[0];
  return ['GET', 'POST'].includes(String(method || '').toUpperCase()) &&
    /^\/api\/whatsapp\/webhook\/[A-Za-z0-9_-]+$/.test(pathname);
}

/**
 * Inicia un proxy local restringido que reenvía webhooks al backend.
 * @param {number} targetPort - Puerto del backend.
 * @param {Object} logger - Registrador de eventos.
 * @returns {Promise<number>} Puerto asignado al proxy.
 */
function startWebhookProxy(targetPort, logger) {
  return new Promise((resolve, reject) => {
    webhookProxy = http.createServer((request, response) => {
      if (!isAllowedWebhookRequest(request.method, request.url)) {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      const upstream = http.request({
        hostname: '127.0.0.1',
        port: targetPort,
        method: request.method,
        path: request.url,
        headers: { ...request.headers, host: `localhost:${targetPort}`, 'x-forwarded-proto': 'https' }
      }, (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });
      upstream.on('error', (error) => {
        logger.warn?.({ err: error }, 'No se pudo entregar el webhook al backend local');
        if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Webhook unavailable' }));
      });
      request.pipe(upstream);
    });
    webhookProxy.once('error', reject);
    webhookProxy.listen(0, '127.0.0.1', () => {
      const address = webhookProxy.address();
      resolve(typeof address === 'object' && address ? address.port : null);
    });
  });
}

/**
 * Inicia un túnel HTTPS de desarrollo y publica su URL en el proceso.
 * @param {Object} options - Puerto local y registrador.
 * @returns {Promise<string|null>} URL pública o `null` cuando se deshabilita.
 */
function startDevelopmentTunnel({ port, logger = console } = {}) {
  if (getPublicUrl()) return Promise.resolve(getPublicUrl());
  if (String(process.env.NODE_ENV).toLowerCase() === 'production') return Promise.resolve(null);
  if (String(process.env.AUTO_DEV_TUNNEL || 'true').toLowerCase() === 'false') return Promise.resolve(null);
  if (starting) return starting;

  starting = new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const launch = async () => {
      try {
        const proxyPort = await startWebhookProxy(port || 3000, logger);
        if (!proxyPort) throw new Error('Webhook proxy did not start');
        tunnelProcess = spawn('cloudflared', [
          'tunnel', '--url', `http://127.0.0.1:${proxyPort}`, '--no-autoupdate'
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        const inspect = (chunk) => {
          const discovered = extractTunnelUrl(chunk);
          if (!discovered) return;
          tunnelUrl = discovered.replace(/\/$/, '');
          logger.info?.({ publicUrl: tunnelUrl }, 'URL HTTPS local lista para webhooks');
          finish(tunnelUrl);
        };
        tunnelProcess.stdout.on('data', inspect);
        tunnelProcess.stderr.on('data', inspect);
        tunnelProcess.on('error', (error) => {
          logger.warn?.({ err: error }, 'No se pudo iniciar la URL HTTPS local');
          finish(null);
        });
        tunnelProcess.on('exit', () => {
          tunnelProcess = null;
          tunnelUrl = null;
          starting = null;
        });
        setTimeout(() => finish(null), 20_000).unref();
      } catch (error) {
        logger.warn?.({ err: error }, 'No se pudo iniciar la URL HTTPS local');
        finish(null);
      }
    };
    launch();
  });
  return starting;
}

/**
 * Detiene el túnel y proxy locales si están activos.
 * @returns {void}
 */
function stopDevelopmentTunnel() {
  if (tunnelProcess) tunnelProcess.kill('SIGTERM');
  if (webhookProxy) webhookProxy.close();
  tunnelProcess = null;
  webhookProxy = null;
  tunnelUrl = null;
  starting = null;
}

module.exports = {
  extractTunnelUrl,
  getPublicUrl,
  isAllowedWebhookRequest,
  normalizePublicUrl,
  startDevelopmentTunnel,
  stopDevelopmentTunnel
};
