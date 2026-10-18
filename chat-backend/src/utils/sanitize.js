/**
 * Normaliza texto de entrada eliminando bytes nulos y espacios laterales.
 *
 * @param {*} value - Valor recibido desde una entrada externa.
 * @returns {string} Texto saneado o una cadena vacía para valores no textuales.
 */
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').trim();
}

/**
 * Normaliza un correo electrónico para comparaciones y persistencia.
 *
 * @param {*} value - Correo recibido desde una entrada externa.
 * @returns {string} Correo saneado en minúsculas.
 */
function sanitizeEmail(value) {
  return sanitizeText(value).toLowerCase();
}

module.exports = {
  sanitizeEmail,
  sanitizeText
};
