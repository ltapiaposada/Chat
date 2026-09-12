const crypto = require('crypto');

function encryptionKey() {
  const value = process.env.WHATSAPP_CREDENTIALS_KEY ||
    (process.env.NODE_ENV !== 'production' ? process.env.AUTH_SECRET : null);
  if (!value) throw new Error('WHATSAPP_CREDENTIALS_KEY is required');
  return crypto.createHash('sha256').update(value).digest();
}

function encryptCredential(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptCredential(value) {
  if (!value) return null;
  const [ivValue, tagValue, encryptedValue] = String(value).split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted credential');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = { decryptCredential, encryptCredential };
