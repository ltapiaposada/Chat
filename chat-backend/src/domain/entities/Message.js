class Message {
  constructor({ id, chatId, userId, content, isRead, createdAt }) {
    this.id = id;
    this.chatId = chatId;
    this.userId = userId;
    this.content = content;
    this.isRead = isRead || false;
    this.createdAt = createdAt;
  }

  markAsRead() {
    this.isRead = true;
  }
}

module.exports = Message;
