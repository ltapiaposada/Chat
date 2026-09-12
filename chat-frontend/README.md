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

Para grabar audio:
- En la misma máquina, `http://localhost` funciona.
- Desde otra máquina en la red, el navegador normalmente exige `HTTPS` para dar acceso al micrófono.
- Si vas a probar el frontend desde otra computadora, inicia Vite con HTTPS usando estas variables de entorno:

```env
VITE_DEV_HTTPS=true
# Opcional: usa tu propio certificado
VITE_DEV_SSL_KEY=/ruta/al/localhost-key.pem
VITE_DEV_SSL_CERT=/ruta/al/localhost.pem
```

Si defines solo `VITE_DEV_HTTPS=true`, Vite intentará levantar HTTPS por defecto. Si además defines `VITE_DEV_SSL_KEY` y `VITE_DEV_SSL_CERT`, usará ese certificado.

## Despliegue en Vercel

Este frontend se puede desplegar en Vercel usando `chat-frontend` como Root Directory.

Variables requeridas en Vercel:
- `VITE_API_URL`: URL publica del backend en Render (ej. `https://chat-backend.onrender.com`)
- `VITE_SOCKET_URL`: misma URL publica del backend en Render

Archivo de soporte incluido:
- `vercel.json`: agrega rewrite a `index.html` para rutas SPA de Vue Router.

Importante:
- En Render debes configurar `CLIENT_URL` con la URL de Vercel para habilitar CORS y Socket.IO.

## Uso

### Modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Widget embebible

El chat del cliente se puede instalar en cualquier sitio web con un solo script:

```html
<script
  src="https://chat.example.com/chat-widget.js"
  data-channel-key="ch_clave_publica_generada"
></script>
```

El widget no solicita credenciales ni requiere controladores en la aplicación
anfitriona. Conserva un identificador aleatorio en el navegador. El botón
**Mis chats**, ubicado dentro del widget, abre una modal con calificación,
comentario, agente, fecha y duración.

La aplicación puede enviar datos visibles del usuario desde el frontend:

```html
<script src="https://chat.example.com/chat-widget.js" data-manual></script>
<script>
  window.SupportChat.init({
    channelKey: 'ch_clave_publica_generada',
    authenticated: true,
    user: { id: usuario.id, name: usuario.nombre, email: usuario.email }
  })
  // Acciones opcionales para integrarlo con el menú del sitio:
  window.SupportChat.open()
  window.SupportChat.openHistory()
  window.SupportChat.close()
</script>
```

Para mostrarlo solamente cuando el sitio tenga una sesión:

```html
<script
  src="https://chat.example.com/chat-widget.js"
  data-channel-key="ch_clave_publica_generada"
  data-api-url="https://api.chat.example.com"
  data-auth-storage-key="token"
  data-user-storage-key="user"
></script>
```

El valor de `data-auth-storage-key` es el nombre usado por el sitio en
`localStorage`. `data-user-storage-key` es la clave que contiene el usuario en
JSON (por defecto `user`). El token solo se usa para comprobar si existe y nunca
se envía al servidor del chat. El widget envía el identificador, nombre y correo
del usuario; reconoce propiedades como `id`, `userId`, `name`, `firstName`,
`lastName`, `email`, `userFirstName`, `userLastName` y `userEmail`.

En un canal `authenticated`, el widget permanece oculto mientras no exista el
token. En un canal `mixed`, usa el usuario autenticado cuando hay token y crea
una identidad `Visitante` cuando no lo hay.
El modo se consulta al backend, por lo que cambiarlo desde Configuración no
obliga a reemplazar el script instalado en el sitio.
Si la sesión no está en `localStorage`, la aplicación puede llamar
`SupportChat.setAuthenticated(true)` después de iniciar sesión y
`SupportChat.setAuthenticated(false)` al cerrar sesión.

No se debe insertar `AUTH_SECRET`, contraseñas ni tokens de agentes en el HTML.
Este modo conserva el historial por navegador y sitio. Recuperarlo en otro
dispositivo requiere una integración servidor-a-servidor opcional.

Durante desarrollo se puede probar con:

```html
<script src="http://localhost:5173/chat-widget.js"></script>
```

La vista interna del iframe vive en `/embed`. En producción, el frontend debe
servirse por HTTPS y `VITE_API_URL`/`VITE_SOCKET_URL` deben apuntar al backend
HTTPS desplegado.

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
