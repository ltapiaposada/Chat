# Integración segura del widget

## Visitantes anónimos

El sitio instala un único script. La solicitud de sesión se realiza desde el
navegador anfitrión para que el backend del chat pueda validar su `Origin` real.

```html
<script
  src="https://chat.example.com/chat-widget.js"
  data-api-url="https://api.chat.example.com"
  data-channel-key="ch_clave_publica"
></script>
```

El identificador aleatorio queda en `localStorage` separado por `channelKey`.
El backend nunca almacena ese valor: guarda un HMAC SHA-256 ligado al canal.
Los campos `name` y `email` enviados libremente por el navegador no se aceptan
como identidad.

## Usuarios autenticados del sitio externo

El secreto de firma pertenece exclusivamente al backend del sitio externo. No
debe aparecer en HTML, JavaScript, variables `VITE_*` ni respuestas públicas.
Tampoco se entrega al chat el JWT o la cookie de sesión propios del sitio.

Flujo:

1. El frontend solicita `/api/chat/assertion` a su propio backend usando su
   sesión normal.
2. Ese backend autentica al usuario y crea una aserción HS256 válida por un
   máximo de 5 minutos.
3. El frontend entrega la aserción al widget mediante
   `SupportChat.setAssertion(assertion)`.
4. La aserción solo puede utilizarse una vez gracias a su `nonce`.

Claims obligatorios:

| Claim | Valor |
|---|---|
| `iss` | Emisor configurado en el canal |
| `aud` | `support-chat-widget` |
| `channel` | `channelKey` público exacto |
| `sub` | ID estable del usuario en el sistema externo |
| `iat` / `exp` | Fechas Unix; duración máxima de 300 segundos |
| `nonce` | Valor criptográficamente aleatorio y de un solo uso |

`name` y `email` son opcionales y solo son confiables porque están firmados.

### Ejemplo Node.js

```js
import crypto from 'node:crypto'

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function createChatAssertion(user) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'HS256', typ: 'JWT' })
  const payload = b64({
    iss: process.env.CHAT_ASSERTION_ISSUER,
    aud: 'support-chat-widget',
    channel: process.env.CHAT_CHANNEL_KEY,
    sub: String(user.id),
    name: user.name,
    email: user.email,
    nonce: crypto.randomUUID(),
    iat: now,
    exp: now + 120
  })
  const signature = crypto.createHmac('sha256', process.env.CHAT_SIGNING_SECRET)
    .update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}
```

### Ejemplo ASP.NET/C#

```csharp
var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
var header = Base64Url(JsonSerializer.Serialize(new { alg = "HS256", typ = "JWT" }));
var payload = Base64Url(JsonSerializer.Serialize(new {
    iss = config["Chat:Issuer"], aud = "support-chat-widget",
    channel = config["Chat:ChannelKey"], sub = user.Id.ToString(),
    name = user.Name, email = user.Email, nonce = Guid.NewGuid().ToString("N"),
    iat = now, exp = now + 120
}));
using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(config["Chat:SigningSecret"]!));
var signature = Base64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{header}.{payload}")));
var assertion = $"{header}.{payload}.{signature}";
```

Uso en el frontend después de obtener la aserción:

```js
const response = await fetch('/api/chat/assertion', { credentials: 'include' })
const { assertion } = await response.json()
window.SupportChat.setAssertion(assertion)
```

## Orígenes y credenciales

Cada canal contiene una lista exacta de orígenes permitidos, incluyendo
protocolo y puerto. Una lista vacía bloquea todas las sesiones web.

Los administradores pueden invalidar inmediatamente una instalación:

- `POST /api/admin/channels/:id/revoke` desactiva el canal.
- `POST /api/admin/channels/:id/rotate-credentials` cambia el `channelKey` y
  el secreto de firma. El nuevo secreto se devuelve una sola vez en la
  respuesta y debe guardarse en el gestor de secretos del backend externo.

Ambos endpoints requieren un JWT del chat con rol `admin` y solo modifican
canales de su propia empresa.
