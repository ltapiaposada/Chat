class User {
  constructor({ id, name, email, role, isOnline, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role; // 'client' | 'agent'
    this.isOnline = isOnline || false;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isAgent() {
    return this.role === 'agent';
  }

  isClient() {
    return this.role === 'client';
  }

  setOnline(status) {
    this.isOnline = status;
  }
}

module.exports = User;
