# Chat Frontend - Vue 3 + TypeScript

Frontend de aplicación de chat en tiempo real construido con Vue 3, TypeScript, Pinia y Socket.IO.

## Características

- ✅ Chat en tiempo real con Socket.IO
- ✅ Múltiples salas de chat
- ✅ Indicadores de escritura
- ✅ Estado de conexión en tiempo real
- ✅ Gestión de estado con Pinia
- ✅ TypeScript para type safety
- ✅ Interfaz responsive

## Tecnologías

- **Vue 3**: Framework JavaScript progresivo
- **TypeScript**: JavaScript con tipos
- **Pinia**: State management
- **Socket.IO Client**: WebSockets en tiempo real
- **Vite**: Build tool y dev server

## Requisitos Previos

- Node.js (v16 o superior)
- Backend corriendo en `http://localhost:3000`

## Configuración

El archivo `.env` ya está configurado:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Uso

### Modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Cómo Usar

1. **Inicia el backend** primero en `http://localhost:3000`

2. **Inicia el frontend**: `npm run dev`

3. **Login**: Ingresa un User ID (por ejemplo: 1)

4. **Unirse a una sala**: Selecciona una sala del sidebar

5. **Chatear**: Escribe y envía mensajes en tiempo real

6. **Probar con múltiples usuarios**: Abre en varias pestañas con diferentes User IDs

## Notas de Integración WhatsApp

Consulta el resumen técnico aquí:
`C:\Users\Luis tapia\Documents\_testing\WHATSAPP_NOTES.md`

## Estructura del Proyecto

```
src/
├── components/
│   ├── ChatRoom.vue      # Componente principal del chat
│   └── RoomList.vue      # Lista de salas
├── services/
│   └── socket.ts         # Servicio de Socket.IO
├── stores/
│   └── chat.ts           # Store de Pinia
└── App.vue               # Componente principal
```
