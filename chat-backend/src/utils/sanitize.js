function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').trim();
}

function sanitizeEmail(value) {
  return sanitizeText(value).toLowerCase();
}

module.exports = {
  sanitizeEmail,
  sanitizeText
};
