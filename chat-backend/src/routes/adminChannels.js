const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { requireRole } = require('../plugins/auth');
const socketService = require('../infrastructure/websocket/socket');
const whatsappConnectionRepository = require('../infrastructure/repositories/WhatsAppConnectionRepository');
const publicUrlService = require('../services/publicUrlService');

function publicWebhookUrl(webhookKey) {
  const baseUrl = publicUrlService.getPublicUrl();
  return baseUrl ? `${baseUrl}/api/whatsapp/webhook/${webhookKey}` : null;
}

function publicKey() {
  return `ch_${crypto.randomUUID().replaceAll('-', '')}`;
}

function signingSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeOrigins(input) {
  if (!Array.isArray(input)) throw new Error('allowedOrigins debe ser una lista');
  return [...new Set(input.map((value) => {
    const parsed = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== String(value).trim()) {
      throw new Error(`Origen inválido: ${value}`);
    }
    return parsed.origin;
  }))];
}

async function audit(db, auth, channelId, action, metadata = {}) {
  await db.query(
    `INSERT INTO admin_audit_logs (company_id, actor_id, channel_id, action, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [auth.companyId, auth.userId, channelId || null, action, JSON.stringify(metadata)]
  );
}

module.exports = async function adminChannelRoutes(fastify, options) {
  const db = options.db;
  const adminOnly = requireRole('admin');

  fastify.get('/api/admin/channels', { preHandler: adminOnly }, async (request) => {
    const result = await db.query(
      `SELECT c.id, c.name, c.slug, c.type, c.public_key, c.allowed_origins,
              c.authentication_mode, c.status, c.assertion_issuer, c.credential_version,
              c.created_at, c.updated_at,
              wc.id AS whatsapp_connection_id, wc.provider AS whatsapp_provider,
              wc.phone_number_id, wc.business_account_id, wc.display_phone_number,
              wc.webhook_key, wc.graph_version, wc.status AS whatsapp_status,
              wc.last_webhook_at, wc.last_error, (wc.app_secret_encrypted IS NOT NULL) AS has_app_secret,
              COUNT(DISTINCT ac.agent_id)::int AS assigned_agents,
              MAX(ch.created_at) AS last_activity_at
       FROM channels c
       LEFT JOIN agent_channels ac ON ac.channel_id = c.id AND ac.company_id = c.company_id
       LEFT JOIN chats ch ON ch.channel_id = c.id AND ch.company_id = c.company_id
       LEFT JOIN whatsapp_connections wc ON wc.channel_id = c.id AND wc.company_id = c.company_id
       WHERE c.company_id = $1 AND c.deleted_at IS NULL
       GROUP BY c.id, wc.id ORDER BY c.created_at ASC`,
      [request.auth.companyId]
    );
    const connected = socketService.getConnectedUsers();
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type,
      publicKey: row.public_key,
      allowedOrigins: row.allowed_origins,
      authenticationMode: row.authentication_mode,
      status: row.status,
      assertionIssuer: row.assertion_issuer,
      credentialVersion: row.credential_version,
      assignedAgents: row.assigned_agents,
      onlineAgents: connected.filter((user) =>
        Number(user.companyId) === Number(request.auth.companyId) &&
        user.channelIds?.some((id) => Number(id) === Number(row.id))
      ).length,
      lastActivityAt: row.last_activity_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
      ,whatsappConnection: row.whatsapp_connection_id ? {
        id: row.whatsapp_connection_id,
        provider: row.whatsapp_provider,
        phoneNumberId: row.phone_number_id,
        businessAccountId: row.business_account_id,
        displayPhoneNumber: row.display_phone_number,
        webhookKey: row.webhook_key,
        webhookPath: `/api/whatsapp/webhook/${row.webhook_key}`,
        webhookUrl: publicWebhookUrl(row.webhook_key),
        graphVersion: row.graph_version,
        status: row.whatsapp_status,
        lastWebhookAt: row.last_webhook_at,
        lastError: row.last_error,
        hasAppSecret: row.has_app_secret
      } : null
    }));
  });

  fastify.post('/api/admin/channels', { preHandler: adminOnly }, async (request, reply) => {
    const body = request.body || {};
    const name = String(body.name || '').trim();
    const slug = String(body.slug || '').trim().toLowerCase();
    const type = body.type || 'web';
    const mode = type === 'web' ? (body.authenticationMode || 'mixed') : 'anonymous';
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return reply.status(400).send({ error: 'Nombre y slug válido son requeridos' });
    }
    if (!['web', 'whatsapp'].includes(type)) {
      return reply.status(400).send({ error: 'Tipo de canal inválido' });
    }
    if (!['anonymous', 'authenticated', 'mixed'].includes(mode)) {
      return reply.status(400).send({ error: 'Modo de autenticación inválido' });
    }
    let origins;
    try { origins = type === 'web' ? normalizeOrigins(body.allowedOrigins || []) : []; }
    catch (error) { return reply.status(400).send({ error: error.message }); }

    const key = publicKey();
    const secret = signingSecret();
    const result = await db.query(
      `INSERT INTO channels
       (company_id, name, slug, type, public_key, signing_secret, allowed_origins,
        authentication_mode, assertion_issuer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, slug, type, public_key, allowed_origins,
                 authentication_mode, status, assertion_issuer, credential_version`,
      [request.auth.companyId, name, slug, type, key, secret, origins,
        mode, type === 'web' ? String(body.assertionIssuer || 'external-site').trim() : 'not-applicable']
    );
    await audit(db, request.auth, result.rows[0].id, 'channel.created', { name, slug, mode });
    return reply.status(201).send({ channel: result.rows[0], signingSecret: secret });
  });

  fastify.patch('/api/admin/channels/:id', { preHandler: adminOnly }, async (request, reply) => {
    const id = Number(request.params.id);
    const body = request.body || {};
    if (body.authenticationMode && !['anonymous', 'authenticated', 'mixed'].includes(body.authenticationMode)) {
      return reply.status(400).send({ error: 'Modo de autenticación inválido' });
    }
    if (body.status && !['active', 'disabled'].includes(body.status)) {
      return reply.status(400).send({ error: 'Estado inválido' });
    }
    let origins = null;
    try { if (body.allowedOrigins !== undefined) origins = normalizeOrigins(body.allowedOrigins); }
    catch (error) { return reply.status(400).send({ error: error.message }); }

    const result = await db.query(
      `UPDATE channels SET
         name = COALESCE($1, name),
         allowed_origins = COALESCE($2, allowed_origins),
         authentication_mode = COALESCE($3, authentication_mode),
         assertion_issuer = COALESCE($4, assertion_issuer),
         status = COALESCE($5, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND company_id = $7 AND deleted_at IS NULL
       RETURNING id, name, slug, type, public_key, allowed_origins,
                 authentication_mode, status, assertion_issuer, credential_version, updated_at`,
      [body.name ? String(body.name).trim() : null, origins, body.authenticationMode || null,
        body.assertionIssuer ? String(body.assertionIssuer).trim() : null,
        body.status || null, id, request.auth.companyId]
    );
    if (!result.rows[0]) return reply.status(404).send({ error: 'Canal no encontrado' });
    await audit(db, request.auth, id, 'channel.updated', {
      fields: Object.keys(body).filter((field) => field !== 'signingSecret')
    });
    return { channel: result.rows[0] };
  });

  fastify.delete('/api/admin/channels/:id', { preHandler: adminOnly }, async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) return reply.status(400).send({ error: 'Canal inválido' });
    const result = await db.query(
      `WITH deleted_channel AS (
         UPDATE channels
         SET status = 'disabled', deleted_at = CURRENT_TIMESTAMP,
             slug = LEFT(slug, 70) || '-deleted-' || id, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id, name
       ), disabled_whatsapp AS (
         UPDATE whatsapp_connections
         SET status = 'disabled', updated_at = CURRENT_TIMESTAMP
         WHERE channel_id IN (SELECT id FROM deleted_channel)
         RETURNING id
       )
       SELECT id, name FROM deleted_channel`,
      [id, request.auth.companyId]
    );
    if (!result.rows[0]) return reply.status(404).send({ error: 'Canal no encontrado' });
    await audit(db, request.auth, id, 'channel.deleted', { name: result.rows[0].name });
    return reply.status(204).send();
  });

  fastify.post('/api/admin/channels/:id/rotate-credentials', { preHandler: adminOnly }, async (request, reply) => {
    const id = Number(request.params.id);
    const key = publicKey();
    const secret = signingSecret();
    const result = await db.query(
      `UPDATE channels SET public_key = $1, signing_secret = $2,
         credential_version = credential_version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND company_id = $4 AND deleted_at IS NULL
       RETURNING id, public_key, credential_version`,
      [key, secret, id, request.auth.companyId]
    );
    if (!result.rows[0]) return reply.status(404).send({ error: 'Canal no encontrado' });
    await db.query('DELETE FROM widget_assertion_nonces WHERE channel_id = $1', [id]);
    await audit(db, request.auth, id, 'channel.credentials_rotated', {
      credentialVersion: result.rows[0].credential_version
    });
    return { channel: result.rows[0], signingSecret: secret };
  });

  fastify.put('/api/admin/channels/:id/whatsapp', { preHandler: adminOnly }, async (request, reply) => {
    const channelId = Number(request.params.id);
    const body = request.body || {};
    const channelResult = await db.query(
      `SELECT id, type FROM channels WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL`,
      [channelId, request.auth.companyId]
    );
    if (!channelResult.rows[0]) return reply.status(404).send({ error: 'Canal no encontrado' });
    if (channelResult.rows[0].type !== 'whatsapp') {
      return reply.status(400).send({ error: 'El canal no es de tipo WhatsApp' });
    }

    const existing = await whatsappConnectionRepository.findByChannelId(
      channelId, request.auth.companyId, true
    );
    const phoneNumberId = String(body.phoneNumberId || existing?.phoneNumberId || '').trim();
    const accessToken = String(body.accessToken || '').trim() || existing?.accessToken || null;
    const verifyToken = String(body.verifyToken || '').trim() || existing?.verifyToken || null;
    const appSecret = String(body.appSecret || '').trim() || existing?.appSecret || null;
    if (!phoneNumberId || (!existing && (!accessToken || !verifyToken || !appSecret))) {
      return reply.status(400).send({
        error: 'ID del número, Token de acceso, Token de verificación y Clave secreta de la aplicación son requeridos al conectar'
      });
    }

    try {
      const connection = await whatsappConnectionRepository.upsert({
        companyId: request.auth.companyId,
        channelId,
        provider: 'meta_cloud',
        phoneNumberId,
        businessAccountId: String(body.businessAccountId || '').trim() || null,
        displayPhoneNumber: String(body.displayPhoneNumber || '').trim() || null,
        accessToken,
        verifyToken,
        appSecret,
        graphVersion: String(body.graphVersion || existing?.graphVersion || 'v19.0').trim(),
        status: 'active'
      });
      await audit(db, request.auth, channelId, existing ? 'whatsapp.connection_updated' : 'whatsapp.connection_created', {
        provider: connection.provider,
        phoneNumberId: connection.phoneNumberId
      });
      if (existing && (body.accessToken || body.verifyToken || body.appSecret)) {
        await audit(db, request.auth, channelId, 'whatsapp.credentials_rotated', {
          fields: ['accessToken', 'verifyToken', 'appSecret'].filter((field) => Boolean(body[field]))
        });
      }
      return { connection: {
        ...connection,
        webhookPath: `/api/whatsapp/webhook/${connection.webhookKey}`,
        webhookUrl: publicWebhookUrl(connection.webhookKey)
      } };
    } catch (error) {
      if (error.code === '23505') {
        return reply.status(409).send({ error: 'Ese número de WhatsApp ya pertenece a otro canal' });
      }
      throw error;
    }
  });

  fastify.post('/api/admin/channels/:id/whatsapp/disconnect', { preHandler: adminOnly }, async (request, reply) => {
    const channelId = Number(request.params.id);
    const connection = await whatsappConnectionRepository.setStatus(
      channelId, request.auth.companyId, 'disabled'
    );
    if (!connection) return reply.status(404).send({ error: 'Conexión de WhatsApp no encontrada' });
    await audit(db, request.auth, channelId, 'whatsapp.connection_disabled');
    return { connection };
  });

  fastify.get('/api/admin/agents', { preHandler: adminOnly }, async (request) => {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_online, u.is_active,
              COALESCE(array_agg(ac.channel_id ORDER BY ac.channel_id)
                FILTER (WHERE assigned_channel.id IS NOT NULL), '{}') AS channel_ids
       FROM users u
       LEFT JOIN agent_channels ac ON ac.agent_id = u.id AND ac.company_id = u.company_id
       LEFT JOIN channels assigned_channel ON assigned_channel.id = ac.channel_id
         AND assigned_channel.company_id = ac.company_id AND assigned_channel.deleted_at IS NULL
       WHERE u.company_id = $1 AND u.role::text IN ('agent', 'supervisor', 'admin')
       GROUP BY u.id ORDER BY u.name`,
      [request.auth.companyId]
    );
    return result.rows.map((row) => ({
      id: row.id, name: row.name, email: row.email, role: row.role,
      isOnline: row.is_online, isActive: row.is_active, channelIds: row.channel_ids.map(Number)
    }));
  });

  fastify.post('/api/admin/agents', { preHandler: adminOnly }, async (request, reply) => {
    const body = request.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = body.role || 'agent';
    const channelIds = [...new Set((body.channelIds || []).map(Number))];
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return reply.status(400).send({ error: 'Nombre, correo válido y contraseña de mínimo 8 caracteres son requeridos' });
    }
    if (!['agent', 'supervisor', 'admin'].includes(role)) {
      return reply.status(400).send({ error: 'Rol inválido' });
    }
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      if (channelIds.length) {
        const valid = await client.query(
          'SELECT id FROM channels WHERE company_id=$1 AND deleted_at IS NULL AND id=ANY($2::int[])',
          [request.auth.companyId, channelIds]
        );
        if (valid.rowCount !== channelIds.length) {
          await client.query('ROLLBACK');
          return reply.status(400).send({ error: 'Hay canales que no pertenecen a la empresa' });
        }
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = (await client.query(
        `INSERT INTO users(name,email,role,password_hash,company_id,is_active)
         VALUES($1,$2,$3,$4,$5,true) RETURNING id,name,email,role,is_active`,
        [name, email, role, passwordHash, request.auth.companyId]
      )).rows[0];
      if (channelIds.length) {
        await client.query(
          `INSERT INTO agent_channels(agent_id,channel_id,company_id)
           SELECT $1,unnest($2::int[]),$3`, [user.id, channelIds, request.auth.companyId]
        );
      }
      await client.query(
        `INSERT INTO admin_audit_logs(company_id,actor_id,action,metadata)
         VALUES($1,$2,'agent.created',$3::jsonb)`,
        [request.auth.companyId, request.auth.userId, JSON.stringify({ agentId: user.id, role, channelIds })]
      );
      await client.query('COMMIT');
      return reply.status(201).send({ agent: { ...user, isActive: user.is_active, channelIds } });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      if (error.code === '23505') return reply.status(409).send({ error: 'El correo ya está registrado' });
      throw error;
    } finally { client.release(); }
  });

  fastify.patch('/api/admin/agents/:id', { preHandler: adminOnly }, async (request, reply) => {
    const agentId = Number(request.params.id);
    const body = request.body || {};
    if (agentId === Number(request.auth.userId) && body.isActive === false) {
      return reply.status(400).send({ error: 'No puedes desactivar tu propia cuenta' });
    }
    if (body.role && !['agent', 'supervisor', 'admin'].includes(body.role)) {
      return reply.status(400).send({ error: 'Rol inválido' });
    }
    if (body.password !== undefined && String(body.password).length < 8) {
      return reply.status(400).send({ error: 'La contraseña debe tener mínimo 8 caracteres' });
    }
    const channelIds = body.channelIds === undefined ? null : [...new Set(body.channelIds.map(Number))];
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      if (channelIds?.length) {
        const valid = await client.query('SELECT id FROM channels WHERE company_id=$1 AND deleted_at IS NULL AND id=ANY($2::int[])',
          [request.auth.companyId, channelIds]);
        if (valid.rowCount !== channelIds.length) {
          await client.query('ROLLBACK');
          return reply.status(400).send({ error: 'Hay canales que no pertenecen a la empresa' });
        }
      }
      const passwordHash = body.password ? await bcrypt.hash(String(body.password), 10) : null;
      const updated = (await client.query(
        `UPDATE users SET name=COALESCE($1,name), role=COALESCE($2::user_role,role),
           is_active=COALESCE($3,is_active), password_hash=COALESCE($4,password_hash), updated_at=CURRENT_TIMESTAMP
         WHERE id=$5 AND company_id=$6 AND role::text IN ('agent','supervisor','admin')
         RETURNING id,name,email,role,is_active`,
        [body.name ? String(body.name).trim() : null, body.role || null,
          typeof body.isActive === 'boolean' ? body.isActive : null, passwordHash,
          agentId, request.auth.companyId]
      )).rows[0];
      if (!updated) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ error: 'Agente no encontrado' });
      }
      if (channelIds !== null) {
        await client.query('DELETE FROM agent_channels WHERE agent_id=$1 AND company_id=$2',
          [agentId, request.auth.companyId]);
        if (channelIds.length) await client.query(
          `INSERT INTO agent_channels(agent_id,channel_id,company_id) SELECT $1,unnest($2::int[]),$3`,
          [agentId, channelIds, request.auth.companyId]
        );
      }
      await client.query(
        `INSERT INTO admin_audit_logs(company_id,actor_id,action,metadata)
         VALUES($1,$2,'agent.updated',$3::jsonb)`,
        [request.auth.companyId, request.auth.userId, JSON.stringify({ agentId, fields: Object.keys(body).filter(k => k !== 'password') })]
      );
      await client.query('COMMIT');
      return { agent: { ...updated, isActive: updated.is_active, channelIds } };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally { client.release(); }
  });

  fastify.put('/api/admin/channels/:id/agents', { preHandler: adminOnly }, async (request, reply) => {
    const channelId = Number(request.params.id);
    const agentIds = [...new Set((request.body?.agentIds || []).map(Number))];
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const channel = await client.query(
        'SELECT id FROM channels WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE',
        [channelId, request.auth.companyId]
      );
      if (!channel.rows[0]) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ error: 'Canal no encontrado' });
      }
      if (agentIds.length) {
        const valid = await client.query(
          `SELECT id FROM users WHERE company_id = $1 AND id = ANY($2::int[])
             AND role::text IN ('agent', 'supervisor', 'admin')`,
          [request.auth.companyId, agentIds]
        );
        if (valid.rowCount !== agentIds.length) {
          await client.query('ROLLBACK');
          return reply.status(400).send({ error: 'La lista contiene agentes inválidos' });
        }
      }
      await client.query('DELETE FROM agent_channels WHERE channel_id = $1 AND company_id = $2',
        [channelId, request.auth.companyId]);
      if (agentIds.length) {
        await client.query(
          `INSERT INTO agent_channels (agent_id, channel_id, company_id)
           SELECT unnest($1::int[]), $2, $3`,
          [agentIds, channelId, request.auth.companyId]
        );
      }
      await client.query(
        `INSERT INTO admin_audit_logs (company_id, actor_id, channel_id, action, metadata)
         VALUES ($1, $2, $3, 'channel.agents_updated', $4::jsonb)`,
        [request.auth.companyId, request.auth.userId, channelId, JSON.stringify({ agentIds })]
      );
      await client.query('COMMIT');
      return { channelId, agentIds };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  fastify.get('/api/admin/audit', { preHandler: adminOnly }, async (request) => {
    const result = await db.query(
      `SELECT a.id, a.action, a.channel_id, a.metadata, a.created_at,
              u.name AS actor_name, c.name AS channel_name
       FROM admin_audit_logs a
       JOIN users u ON u.id = a.actor_id
       LEFT JOIN channels c ON c.id = a.channel_id
       WHERE a.company_id = $1 ORDER BY a.created_at DESC LIMIT 50`,
      [request.auth.companyId]
    );
    return result.rows;
  });
};
