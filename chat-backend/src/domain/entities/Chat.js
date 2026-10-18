class Chat {
  /**
   * Crea la representación de dominio de una conversación de soporte.
   *
   * @param {Object} data - Datos persistidos de la conversación.
   */
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

  /** @returns {boolean} Indica si la conversación espera asignación. */
  isPending() {
    return this.status === 'pending';
  }

  /** @returns {boolean} Indica si la conversación está siendo atendida. */
  isActive() {
    return this.status === 'active';
  }

  /** @returns {boolean} Indica si la conversación está en espera. */
  isOnHold() {
    return this.status === 'on_hold';
  }

  /** @returns {boolean} Indica si la conversación está cerrada. */
  isClosed() {
    return this.status === 'closed';
  }

  /** @returns {boolean} Indica si un agente puede tomar la conversación. */
  canBeAssigned() {
    return this.status === 'pending';
  }

  /**
   * Asigna la conversación a un agente y la activa.
   *
   * @param {number} agentId - Identificador del agente.
   * @returns {void}
   * @throws {Error} Si la conversación no está pendiente.
   */
  assign(agentId) {
    if (!this.canBeAssigned()) {
      throw new Error('Chat cannot be assigned in current status');
    }
    this.agentId = agentId;
    this.status = 'active';
    this.assignedAt = new Date();
  }

  /**
   * Pone en espera una conversación activa.
   *
   * @returns {void}
   * @throws {Error} Si la conversación no está activa.
   */
  putOnHold() {
    if (!this.isActive()) {
      throw new Error('Only active chats can be put on hold');
    }
    this.status = 'on_hold';
  }

  /**
   * Reactiva una conversación en espera o cerrada.
   *
   * @returns {void}
   * @throws {Error} Si el estado actual no permite reactivarla.
   */
  reactivate() {
    if (!this.isOnHold() && !this.isClosed()) {
      throw new Error('Only on-hold or closed chats can be reactivated');
    }
    this.status = 'active';
  }

  /**
   * Cierra la conversación y registra el momento del cierre.
   *
   * @returns {void}
   * @throws {Error} Si la conversación ya estaba cerrada.
   */
  close() {
    if (this.isClosed()) {
      throw new Error('Chat is already closed');
    }
    this.status = 'closed';
    this.closedAt = new Date();
  }

  /**
   * Reabre como pendiente una conversación cuando el cliente vuelve a escribir.
   *
   * @returns {void}
   */
  reopenAsPending() {
    this.status = 'pending';
    this.agentId = null;
    this.closedAt = null;
  }
}

module.exports = Chat;
