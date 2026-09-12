const db = require('../database/postgres');
const { decryptCredential, encryptCredential } = require('../../config/credentialCrypto');

function map(row, includeCredentials = false) {
  if (!row) return null;
  const connection = {
    id: row.id,
    companyId: row.company_id,
    channelId: row.channel_id,
    provider: row.provider,
    phoneNumberId: row.phone_number_id,
    businessAccountId: row.business_account_id,
    displayPhoneNumber: row.display_phone_number,
    webhookKey: row.webhook_key,
    graphVersion: row.graph_version,
    status: row.status,
    lastWebhookAt: row.last_webhook_at,
    lastError: row.last_error,
    hasAppSecret: Boolean(row.app_secret_encrypted),
    updatedAt: row.updated_at
  };
  if (includeCredentials) {
    connection.accessToken = decryptCredential(row.access_token_encrypted);
    connection.verifyToken = decryptCredential(row.verify_token_encrypted);
    connection.appSecret = decryptCredential(row.app_secret_encrypted);
  }
  return connection;
}

class WhatsAppConnectionRepository {
  async findByWebhookKey(webhookKey, includeCredentials = true) {
    const result = await db.query('SELECT * FROM whatsapp_connections WHERE webhook_key = $1', [webhookKey]);
    return map(result.rows[0], includeCredentials);
  }

  async findByPhoneNumberId(phoneNumberId, includeCredentials = true) {
    const result = await db.query('SELECT * FROM whatsapp_connections WHERE phone_number_id = $1', [phoneNumberId]);
    return map(result.rows[0], includeCredentials);
  }

  async findByChannelId(channelId, companyId, includeCredentials = true) {
    const result = await db.query(
      'SELECT * FROM whatsapp_connections WHERE channel_id = $1 AND company_id = $2',
      [channelId, companyId]
    );
    return map(result.rows[0], includeCredentials);
  }

  async listByCompany(companyId) {
    const result = await db.query(
      'SELECT * FROM whatsapp_connections WHERE company_id = $1 ORDER BY created_at',
      [companyId]
    );
    return result.rows.map((row) => map(row, false));
  }

  async upsert({ companyId, channelId, provider = 'meta_cloud', phoneNumberId,
    businessAccountId, displayPhoneNumber, accessToken, verifyToken, appSecret,
    graphVersion = 'v19.0', status = 'pending' }) {
    const result = await db.query(
      `INSERT INTO whatsapp_connections
       (company_id, channel_id, provider, phone_number_id, business_account_id,
        display_phone_number, access_token_encrypted, verify_token_encrypted,
        app_secret_encrypted, graph_version, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (channel_id) DO UPDATE SET
         provider=EXCLUDED.provider, phone_number_id=EXCLUDED.phone_number_id,
         business_account_id=EXCLUDED.business_account_id,
         display_phone_number=EXCLUDED.display_phone_number,
         access_token_encrypted=COALESCE(EXCLUDED.access_token_encrypted, whatsapp_connections.access_token_encrypted),
         verify_token_encrypted=COALESCE(EXCLUDED.verify_token_encrypted, whatsapp_connections.verify_token_encrypted),
         app_secret_encrypted=COALESCE(EXCLUDED.app_secret_encrypted, whatsapp_connections.app_secret_encrypted),
         graph_version=EXCLUDED.graph_version, status=EXCLUDED.status,
         updated_at=CURRENT_TIMESTAMP
       WHERE whatsapp_connections.company_id = EXCLUDED.company_id
       RETURNING *`,
      [companyId, channelId, provider, phoneNumberId, businessAccountId || null,
        displayPhoneNumber || null, encryptCredential(accessToken), encryptCredential(verifyToken),
        encryptCredential(appSecret), graphVersion, status]
    );
    return map(result.rows[0], false);
  }

  async touchWebhook(id, error = null) {
    await db.query(
      `UPDATE whatsapp_connections SET last_webhook_at=CURRENT_TIMESTAMP,
       last_error=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [id, error]
    );
  }

  async setStatus(channelId, companyId, status) {
    const result = await db.query(
      `UPDATE whatsapp_connections SET status=$1, updated_at=CURRENT_TIMESTAMP
       WHERE channel_id=$2 AND company_id=$3 RETURNING *`,
      [status, channelId, companyId]
    );
    return map(result.rows[0], false);
  }
}

module.exports = new WhatsAppConnectionRepository();
