class User {
  /**
   * Crea la representación de dominio de un usuario.
   *
   * @param {Object} data - Datos persistidos del usuario.
   */
  constructor({ id, name, email, role, isOnline, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role; // 'client' | 'agent'
    this.isOnline = isOnline || false;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /** @returns {boolean} Indica si el usuario tiene el rol de agente. */
  isAgent() {
    return this.role === 'agent';
  }

  /** @returns {boolean} Indica si el usuario tiene el rol de cliente. */
  isClient() {
    return this.role === 'client';
  }

  /**
   * Actualiza el estado de conexión del usuario en memoria.
   *
   * @param {boolean} status - Nuevo estado de conexión.
   * @returns {void}
   */
  setOnline(status) {
    this.isOnline = status;
  }
}

module.exports = User;
