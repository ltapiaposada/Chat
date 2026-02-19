# Socket.IO Events Documentation

## Eventos del Cliente al Servidor

### `authenticate`
Autentica al usuario con el sistema de sockets.

**Payload:**
```javascript
userId // number
```

**Ejemplo:**
```javascript
socket.emit('authenticate', 123);
```

---

### `join:room`
Une al usuario a una sala de chat.

**Payload:**
```javascript
roomId // number
```

**Ejemplo:**
```javascript
socket.emit('join:room', 1);
```

---

### `leave:room`
Saca al usuario de una sala de chat.

**Payload:**
```javascript
roomId // number
```

**Ejemplo:**
```javascript
socket.emit('leave:room', 1);
```

---

### `message:send`
Envía un mensaje a una sala.

**Payload:**
```javascript
{
  roomId: number,
  userId: number,
  content: string
}
```

**Ejemplo:**
```javascript
socket.emit('message:send', {
  roomId: 1,
  userId: 123,
  content: 'Hola a todos!'
});
```

---

### `typing:start`
Indica que el usuario está escribiendo.

**Payload:**
```javascript
{
  roomId: number,
  userId: number
}
```

**Ejemplo:**
```javascript
socket.emit('typing:start', {
  roomId: 1,
  userId: 123
});
```

---

### `typing:stop`
Indica que el usuario dejó de escribir.

**Payload:**
```javascript
{
  roomId: number,
  userId: number
}
```

**Ejemplo:**
```javascript
socket.emit('typing:stop', {
  roomId: 1,
  userId: 123
});
```

---

## Eventos del Servidor al Cliente

### `message:new`
Notifica sobre un nuevo mensaje en la sala.

**Payload:**
```javascript
{
  id: number,
  roomId: number,
  userId: number,
  content: string,
  timestamp: Date
}
```

**Ejemplo:**
```javascript
socket.on('message:new', (data) => {
  console.log('Nuevo mensaje:', data);
});
```

---

### `user:joined`
Notifica que un usuario se unió a la sala.

**Payload:**
```javascript
{
  userId: number,
  roomId: number,
  timestamp: Date
}
```

**Ejemplo:**
```javascript
socket.on('user:joined', (data) => {
  console.log(`Usuario ${data.userId} se unió`);
});
```

---

### `user:left`
Notifica que un usuario salió de la sala.

**Payload:**
```javascript
{
  userId: number,
  roomId: number,
  timestamp: Date
}
```

**Ejemplo:**
```javascript
socket.on('user:left', (data) => {
  console.log(`Usuario ${data.userId} salió`);
});
```

---

### `user:typing`
Notifica que un usuario está escribiendo.

**Payload:**
```javascript
{
  userId: number,
  roomId: number
}
```

**Ejemplo:**
```javascript
socket.on('user:typing', (data) => {
  console.log(`Usuario ${data.userId} está escribiendo...`);
});
```

---

### `user:stopped-typing`
Notifica que un usuario dejó de escribir.

**Payload:**
```javascript
{
  userId: number,
  roomId: number
}
```

**Ejemplo:**
```javascript
socket.on('user:stopped-typing', (data) => {
  console.log(`Usuario ${data.userId} dejó de escribir`);
});
```

---

## Eventos de Conexión

### `connect`
Se dispara cuando el cliente se conecta al servidor.

**Ejemplo:**
```javascript
socket.on('connect', () => {
  console.log('Conectado con ID:', socket.id);
});
```

---

### `disconnect`
Se dispara cuando el cliente se desconecta.

**Ejemplo:**
```javascript
socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
});
```

---

## Métodos del Servidor (desde código backend)

### `socketService.emitToRoom(roomId, event, data)`
Emite un evento a todos los usuarios en una sala específica.

**Ejemplo:**
```javascript
const socketService = require('./infrastructure/websocket/socket');
socketService.emitToRoom(1, 'announcement', { 
  message: 'Nueva notificación' 
});
```

---

### `socketService.emitToUser(userId, event, data)`
Emite un evento a un usuario específico.

**Ejemplo:**
```javascript
socketService.emitToUser(123, 'notification', { 
  message: 'Tienes un nuevo mensaje privado' 
});
```

---

### `socketService.getConnectedUsers()`
Obtiene la lista de IDs de usuarios conectados.

**Ejemplo:**
```javascript
const users = socketService.getConnectedUsers();
console.log('Usuarios conectados:', users);
```
