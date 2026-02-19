class Chat {
  constructor({ id, clientId, agentId, status, subject, createdAt, assignedAt, closedAt, updatedAt }) {
    this.id = id;
    this.clientId = clientId;
    this.agentId = agentId;
    this.status = status; // 'pending' | 'active' | 'on_hold' | 'closed'
    this.subject = subject;
    this.createdAt = createdAt;
    this.assignedAt = assignedAt;
    this.closedAt = closedAt;
    this.updatedAt = updatedAt;
  }

  isPending() {
    return this.status === 'pending';
  }

  isActive() {
    return this.status === 'active';
  }

  isOnHold() {
    return this.status === 'on_hold';
  }

  isClosed() {
    return this.status === 'closed';
  }

  canBeAssigned() {
    return this.status === 'pending';
  }

  assign(agentId) {
    if (!this.canBeAssigned()) {
      throw new Error('Chat cannot be assigned in current status');
    }
    this.agentId = agentId;
    this.status = 'active';
    this.assignedAt = new Date();
  }

  putOnHold() {
    if (!this.isActive()) {
      throw new Error('Only active chats can be put on hold');
    }
    this.status = 'on_hold';
  }

  reactivate() {
    if (!this.isOnHold() && !this.isClosed()) {
      throw new Error('Only on-hold or closed chats can be reactivated');
    }
    this.status = 'active';
  }

  close() {
    if (this.isClosed()) {
      throw new Error('Chat is already closed');
    }
    this.status = 'closed';
    this.closedAt = new Date();
  }

  reopenAsPending() {
    // When a closed chat receives a new message from client
    this.status = 'pending';
    this.agentId = null;
    this.closedAt = null;
  }
}

module.exports = Chat;
