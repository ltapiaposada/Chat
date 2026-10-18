class Message {
  /**
   * Crea la representación de dominio de un mensaje.
   *
   * @param {Object} data - Datos persistidos del mensaje.
   */
  constructor({ id, chatId, userId, content, isRead, createdAt }) {
    this.id = id;
    this.chatId = chatId;
    this.userId = userId;
    this.content = content;
    this.isRead = isRead || false;
    this.createdAt = createdAt;
  }

  /** @returns {void} Marca el mensaje como leído en memoria. */
  markAsRead() {
    this.isRead = true;
  }
}

module.exports = Message;
