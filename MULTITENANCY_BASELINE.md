# Fase 0: línea base de aislamiento multiempresa

Fecha de auditoría: 2026-09-09.

## Alcance

Esta línea base inventaría los puntos que leen o modifican usuarios, chats,
mensajes y adjuntos. Describe el comportamiento actual; todavía no introduce
empresas o canales en producción.

## Flujo actual

### Cliente tradicional

1. Inicia sesión o se registra por HTTP.
2. Recibe un JWT con `userId`, nombre y rol.
3. Autentica Socket.IO con ese token.
4. Crea y consulta chats asociados a su `client_id`.

### Visitante del widget

1. El script genera un `visitorId` en `localStorage`.
2. Envía `widgetId`, `visitorId` y datos de contacto a `/api/widget/session`.
3. El backend crea o reutiliza un usuario mediante la combinación
   `widget + widgetId + visitorId`.
4. El backend devuelve un JWT de cliente.
5. Desde ese punto utiliza el mismo flujo Socket.IO del cliente tradicional.

`widgetId` separa indirectamente las identidades de visitantes, pero todavía
no representa una empresa o canal autorizado.

### Agente

1. Inicia sesión y autentica Socket.IO como `agent`.
2. Entra en la sala global `agents`.
3. Recibe todos los chats pendientes publicados en esa sala.
4. Puede tomar un chat pendiente y posteriormente la policy valida únicamente
   que sea el agente asignado.

Actualmente no existe empresa, canal asignado ni administrador diferenciado.

## Inventario HTTP

| Punto | Recurso | Protección actual | Contexto de empresa | Riesgo |
|---|---|---|---|---|
| `POST /api/login` | Usuario | Credenciales + rate limit | No | Alto: identidad sin tenant |
| `POST /api/register-client` | Usuario | Validación + rate limit | No | Alto: registro global |
| `GET /api/client/session` | Usuario | JWT cliente | No | Medio |
| `POST /api/widget/session` | Usuario widget | `widgetId` y `visitorId` públicos | No | Crítico: canal no registrado ni origen ligado al canal |
| `POST /api/ai/assist` | Contenido | Rol agente | No | Alto: agente sin empresa |
| `GET/POST /api/whatsapp/webhook` | WhatsApp | Verificación/firma del proveedor | No | Alto: canal global |
| `POST /api/storage-chat/upload` | Mensaje/adjunto | JWT + pertenencia al chat | No | Alto: policy sin tenant |
| `GET /api/storage-chat/:entity_id` | Adjuntos | Pertenencia al chat | No | Alto: policy sin tenant |
| `GET /api/storage-chat/download/:id` | Adjunto | Pertenencia al chat | No | Alto: lookup inicial global por ID |
| `DELETE /api/storage-chat/:id` | Adjunto | Pertenencia al chat | No | Alto: lookup inicial global por ID |
| `GET/POST /api/quick-phrases` | Frases | Rol agente | No | Alto: catálogo compartido globalmente |

## Inventario Socket.IO de soporte

| Evento | Protección actual | Falta para multiempresa | Riesgo |
|---|---|---|---|
| `client:get-history` | Rol cliente + `client_id` | Empresa/canal explícitos | Medio |
| `client:start-chat` | Rol cliente | Tomar tenant/canal de la sesión | Crítico |
| `client:send-message` | Propietario del chat | Tenant en policy y consulta | Alto |
| `client:end-chat` | Propietario del chat | Tenant en policy y consulta | Alto |
| `agent:get-pending-chats` | Sin guard de rol dentro del handler | Empresa + canales asignados | Crítico |
| `agent:get-my-chats` | Rol agente + `agent_id` | Empresa + canal | Alto |
| `agent:get-available-agents` | Sin guard de rol dentro del handler | Empresa + canal compartido | Crítico |
| `agent:assign-chat` | Rol agente | Canal asignado + tenant | Crítico |
| `agent:transfer-chat` | Agente asignado | Validar tenant y canal del destino | Crítico |
| `agent:send-message` | Agente asignado | Tenant en policy y consulta | Alto |
| `agent:put-on-hold` | Agente asignado | Tenant en policy y consulta | Alto |
| `agent:resume-chat` | Agente asignado | Tenant en policy y consulta | Alto |
| `agent:close-chat` | Agente asignado | Tenant en policy y consulta | Alto |
| `messages:get` | Participante del chat | Tenant en policy y consulta | Alto |
| `messages:mark-read` | Participante del chat | Tenant en policy y consulta | Alto |
| `typing:start/stop` | Busca chat, pero no llama la policy de acceso | Policy completa | Crítico |
| `chat:submit-survey` | No valida rol ni propiedad del chat | Cliente propietario + tenant | Crítico |
| `agent:get-history` | Rol agente + `agent_id` | Empresa + canal | Alto |

## Colaboración interna

Los eventos globales, mensajes directos y grupos están diseñados actualmente
como espacios globales. Antes de habilitar múltiples empresas deben aislarse:

- Sala `global-chat` por empresa.
- Presencia de agentes por empresa.
- Mensajes directos limitados a agentes de la misma empresa.
- Grupos, miembros, mensajes y contadores asociados a empresa.

Aunque no forman parte del widget, omitirlos permitiría fugas de nombres,
presencia y mensajes internos entre organizaciones.

## Inventario de repositorios

| Repositorio | Situación actual |
|---|---|
| `ChatRepository` | Todos los métodos usan IDs, estado o agente sin tenant. `findPending()` es global. |
| `MessageRepository` | Opera por `chatId` o `messageId`; depende de una policy externa sin tenant. |
| `UserRepository` | Búsquedas por email, rol y estado son globales. |
| `GlobalMessageRepository` | Canal global único. |
| `AgentDmRepository` | No verifica empresa de participantes. |
| `GroupChatRepository` | Grupos y membresías sin empresa. |
| `GroupMessageRepository` | Mensajes por grupo sin empresa. |
| `UnreadRepository` | Contadores por usuario/grupo, sin contexto de empresa. |

## Matriz detallada de acceso objetivo

| Recurso/acción | Visitante | Agente asignado | Agente no asignado | Supervisor | Admin empresa | Otra empresa |
|---|---:|---:|---:|---:|---:|---:|
| Crear chat en canal habilitado | Sí | No | No | No | No | No |
| Ver chat propio | Sí | Sí | No | Sí | Sí | No |
| Ver cola de canal | No | Sí | No | Sí | Sí | No |
| Tomar chat pendiente | No | Sí | No | Sí | Sí | No |
| Enviar mensaje | Propio | Asignado | No | Según policy | Sí | No |
| Cerrar chat | Propio | Asignado | No | Sí | Sí | No |
| Calificar chat | Propio cerrado | No | No | No | No | No |
| Ver/descargar adjunto | Participante | Participante | No | Sí | Sí | No |
| Transferir chat | No | Canal compatible | No | Sí | Sí | No |
| Ver agentes disponibles | No | Mismo canal | No | Empresa | Empresa | No |
| Administrar canal | No | No | No | Según policy | Sí | No |
| Rotar clave del canal | No | No | No | No | Sí | No |

## Casos de prueba de aislamiento

Los fixtures reproducibles están en
`chat-backend/test-fixtures/multitenancy.js` y contienen dos empresas, dos
canales, dos agentes, dos clientes y dos chats.

La suite `multitenancy-baseline.test.js` documenta mediante pruebas de
caracterización que actualmente:

1. Los métodos del repositorio no reciben tenant.
2. La policy de acceso a chats ignora una empresa inconsistente.
3. La policy de agentes ignora la asignación de canales.

Estas pruebas pasan porque describen el riesgo actual. En las fases de
implementación deben reemplazarse por pruebas negativas que esperen `Forbidden`
y por consultas que requieran siempre `companyId` y `channelId`.

## Riesgos priorizados

### Críticos

1. Cola y notificaciones de agentes globales.
2. Asignación de cualquier chat pendiente sin canal autorizado.
3. `typing:start/stop` sin autorización del recurso.
4. Encuesta modificable sin comprobar propietario.
5. Sesión del widget basada en un `widgetId` público no registrado.
6. Colaboración y presencia global entre futuros tenants.

### Altos

1. Repositorios sin contexto obligatorio de tenant.
2. Transferencia a agentes sin validar empresa/canal.
3. Adjuntos autorizados por una policy que aún no conoce tenant.
4. Usuarios, agentes y frases rápidas consultados globalmente.

### Medios

1. El historial del cliente está protegido por `client_id`, pero carece de
   defensa adicional por tenant/canal.

## Puerta de salida de Fase 0

- [x] Inventario de rutas HTTP y eventos Socket.IO.
- [x] Flujo actual documentado para cliente, widget y agente.
- [x] Fixtures reproducibles de empresa A y empresa B.
- [x] Pruebas de caracterización del riesgo actual.
- [x] Registro de puntos sin autorización por recurso/tenant.

La Fase 1 puede comenzar cuando esta línea base y su suite estén en verde.
