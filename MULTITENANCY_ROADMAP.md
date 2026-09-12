# Hoja de ruta: chat multiempresa seguro

## Objetivo

Convertir el chat actual en una plataforma multiempresa donde cada organización
pueda instalar el widget en uno o varios sitios, asignar agentes a esos canales
y mantener conversaciones, visitantes e historiales completamente aislados.

La integración en el sitio externo debe seguir siendo sencilla: un único
`<script>`. La seguridad y las decisiones de autorización deben vivir en el
backend del chat, nunca depender solamente del frontend.

## Estado actual

- [x] Existe un widget instalable mediante un único script.
- [x] El widget permite visitantes anónimos.
- [x] Puede ocultarse hasta que el sitio anfitrión tenga una sesión.
- [x] La identidad del widget combina un `channelKey` registrado y `visitorId`.
- [x] El historial del cliente se consulta por su `client_id`.
- [x] Existe una entidad formal de empresa y todos los usuarios tienen empresa.
- [x] `widgetId` fue eliminado; el servidor genera claves públicas de canal.
- [x] Los chats guardan explícitamente empresa y canal.
- [x] Las colas y notificaciones de agentes están aisladas por empresa.
- [ ] No existe asignación de agentes a canales.
- [ ] No existe una vista administrativa para configurar canales.

## Decisiones de arquitectura

1. Una **empresa** es la frontera principal de seguridad.
2. Un **canal** representa una instalación: sitio web, aplicación o futuro
   proveedor como WhatsApp.
3. Cada chat guarda `company_id` y `channel_id`, aunque estos datos también
   puedan inferirse desde el usuario. Esta redundancia intencional permite
   aplicar defensa en profundidad.
4. Una clave pública del canal identifica la instalación, pero no concede
   privilegios administrativos.
5. Los agentes solo acceden a canales asignados dentro de su empresa.
6. Los visitantes anónimos se identifican con un valor aleatorio persistente y
   limitado al canal.
7. Los usuarios autenticados deben usar una aserción firmada por el backend del
   sitio externo. No se confiará en un ID o correo enviado libremente desde
   JavaScript.
8. Ningún repositorio o handler puede consultar chats sin contexto de empresa.
9. La vista de configuración se construirá después de proteger el modelo y las
   consultas del backend.

## Modelo objetivo

```text
companies
  id
  name
  slug
  status
  created_at

channels
  id
  company_id -> companies.id
  name
  type
  public_key (única, aleatoria, revocable)
  allowed_origins
  authentication_mode
  status
  created_at

users
  ...campos actuales
  company_id -> companies.id

agent_channels
  agent_id -> users.id
  channel_id -> channels.id
  created_at
  PRIMARY KEY (agent_id, channel_id)

chats
  ...campos actuales
  company_id -> companies.id
  channel_id -> channels.id

external_identity_providers (fase de usuarios autenticados)
  id
  company_id -> companies.id
  channel_id -> channels.id
  issuer
  verification_secret_encrypted o public_key
  status
```

## Reglas obligatorias de seguridad

- Toda lectura o escritura de chats valida `company_id`.
- Toda acción de agente valida además que el canal esté asignado al agente.
- Los administradores solo administran recursos de su empresa.
- Las claves públicas de canal deben ser generadas por el servidor, tener
  entropía suficiente y poder rotarse o revocarse.
- `allowed_origins` se valida en el endpoint que crea la sesión del widget.
- El `Origin` ayuda a restringir abuso, pero no sustituye la autenticación.
- Los tokens del chat contienen como mínimo `userId`, `companyId`, `role` y una
  expiración corta.
- Nunca se acepta `companyId` del navegador como autoridad. Se obtiene desde la
  clave de canal o desde la sesión autenticada.
- Las consultas se parametrizan y las restricciones importantes se refuerzan
  con claves foráneas, índices y constraints.
- Los eventos Socket.IO aplican las mismas policies que las rutas HTTP.
- Los intentos de acceso cruzado se registran sin exponer tokens ni datos
  personales.

## Ejecución por fases

### Fase 0 — Línea base y pruebas de aislamiento

- [x] Inventariar rutas HTTP, eventos Socket.IO y repositorios que acceden a
  usuarios, chats, mensajes y adjuntos.
- [x] Documentar el flujo actual de cliente, agente y administrador.
- [x] Crear fixtures para dos empresas, dos canales y agentes separados.
- [x] Escribir primero pruebas que demuestren el riesgo actual de acceso cruzado.
- [x] Registrar consultas y eventos que todavía carecen de autorización por
  recurso.

**Criterio de cierre:** existe una matriz de permisos y pruebas reproducibles
para aislamiento entre dos empresas.

### Fase 1 — Empresas y canales

- [x] Elegir e introducir una herramienta de migraciones versionadas.
- [x] Crear tablas `companies` y `channels`.
- [x] Crear una empresa inicial para migrar los datos existentes.
- [x] Crear un canal inicial para el widget actual.
- [x] Agregar `company_id` a usuarios.
- [x] Migrar todos los usuarios existentes a la empresa inicial.
- [x] Migrar `external_tenant_id` a `channel_id` y retirar la columna anterior
  sin perder historiales.
- [x] Generar claves públicas de canal en el servidor.
- [x] Agregar índices y constraints de unicidad por empresa/canal.

**Criterio de cierre:** todos los registros existentes pertenecen a una empresa
y el widget resuelve un canal registrado mediante una clave generada.

### Fase 2 — Chats y mensajes con contexto de tenant

- [x] Agregar `company_id` y `channel_id` a `chats`.
- [x] Rellenar esos campos en los chats existentes.
- [x] Hacerlos obligatorios después de validar la migración.
- [x] Modificar la creación de chats para tomar empresa y canal de la sesión.
- [x] Actualizar `ChatRepository` para requerir contexto de empresa.
- [x] Proteger consultas de mensajes, calificaciones y adjuntos mediante el chat
  autorizado.
- [x] Evitar métodos genéricos como `findById(id)` cuando no incluyan tenant.
- [x] Añadir pruebas negativas de acceso cruzado HTTP y Socket.IO.

**Criterio de cierre:** conocer un `chatId` de otra empresa no permite leerlo,
modificarlo, marcarlo como leído ni descargar sus adjuntos.

### Fase 3 — Asignación y autorización de agentes

- [x] Crear `agent_channels`.
- [x] Asignar los agentes existentes a los canales activos durante la migración.
- [x] Incluir `companyId` en el JWT del agente.
- [x] Crear una policy central para acceso a canales y chats.
- [x] Filtrar conversaciones pendientes por canales asignados.
- [x] Filtrar historial, chats activos y métricas del agente.
- [x] Proteger asignación, transferencia, pausa y cierre de chats.
- [x] Definir permisos diferenciados para `admin`, `supervisor` y `agent`.
- [x] Probar que un agente de empresa A no recibe eventos de empresa B.

**Criterio de cierre:** las salas, emisiones y consultas de Socket.IO están
segmentadas por empresa y canal.

### Fase 4 — Identidad segura del visitante

#### Visitante anónimo

- [x] Reemplazar `widgetId` por `data-channel-key`.
- [x] Resolver empresa y canal exclusivamente en el backend.
- [x] Limitar `visitorId` al canal y almacenar solo lo necesario.
- [x] Aplicar rate limiting por canal, IP y visitante.
- [x] Validar `Origin` contra los dominios configurados.
- [x] Permitir revocar o rotar la clave del canal.

#### Usuario autenticado del sitio externo

- [x] Definir un contrato de aserción firmada de corta duración.
- [x] Permitir firma HMAC por canal.
- [x] Validar emisor, audiencia, expiración, canal y nonce.
- [x] Mapear el `subject` externo a una identidad interna por empresa/canal.
- [x] No enviar el JWT de sesión propio del sitio externo al chat.
- [x] Documentar ejemplos mínimos para distintos backends.
- [x] Probar expiración, firma incorrecta, replay y cambio de canal.

**Criterio de cierre:** un navegador no puede suplantar a otro usuario cambiando
un ID, correo o propiedad del script.

### Fase 5 — Vista administrativa de configuración

- [x] Crear sección **Configuración > Canales** solo para administradores.
- [x] Listar canales de la empresa activa.
- [x] Crear, editar, activar y desactivar canales.
- [x] Configurar dominios permitidos.
- [x] Seleccionar modo `anónimo`, `autenticado` o `mixto`.
- [x] Mostrar el script de instalación listo para copiar.
- [x] Rotar la clave pública con advertencia y confirmación.
- [x] Asignar agentes a cada canal.
- [x] Mostrar estado de conexión y última actividad sin revelar información
  sensible.
- [x] Registrar auditoría de cambios administrativos.

Ejemplo de integración objetivo:

```html
<script
  src="https://chat.example.com/chat-widget.js"
  data-channel-key="ch_public_key_generada"
></script>
```

**Criterio de cierre:** un administrador configura la integración sin editar la
base de datos y solo puede administrar canales de su empresa.

### Fase 6 — WhatsApp multiempresa y bandeja unificada

Esta fase tiene prioridad sobre departamentos porque la configuración actual de
WhatsApp es global. Antes de incorporar más reglas de distribución, cada mensaje
entrante y cada respuesta deben quedar vinculados de forma inequívoca con la
empresa, el canal y el número correctos.

Modelo objetivo, siguiendo el patrón de canales independientes usado por
plataformas como JivoChat:

```text
Empresa
└── Canal WhatsApp
    ├── Número / phone_number_id
    ├── Cuenta de WhatsApp Business
    ├── Proveedor y credenciales
    ├── Webhook verificable
    └── Agentes asignados
```

- [x] Crear `whatsapp_connections` con `company_id`, `channel_id`, proveedor,
  `phone_number_id`, cuenta de WhatsApp Business, número visible y estado.
- [x] Garantizar que cada `phone_number_id` identifica una sola conexión y un
  solo canal.
- [x] Retirar la configuración global de WhatsApp; resolver credenciales siempre
  desde `chat.channel_id`.
- [x] Cifrar tokens y secretos del proveedor en reposo y no devolverlos en APIs
  de consulta.
- [x] Resolver primero la conexión en cada webhook y derivar desde ella
  `channel_id` y `company_id`; nunca aceptar esos IDs desde el payload externo.
- [x] Validar firma, secreto o mecanismo equivalente del proveedor antes de
  procesar el webhook.
- [x] Implementar idempotencia por identificador externo para evitar mensajes
  duplicados cuando el proveedor reintente entregas.
- [x] Aislar contactos de WhatsApp por empresa, canal y usuario del proveedor;
  el mismo teléfono puede ser un contacto distinto en empresas diferentes.
- [x] Crear una interfaz/adaptador de proveedor para recibir mensajes, enviar
  respuestas, consultar estados y descargar adjuntos.
- [x] Enviar cada respuesta usando exclusivamente la conexión asociada al
  `channel_id` del chat, sin permitir que el agente elija manualmente el número.
- [x] Procesar estados `sent`, `delivered`, `read` y `failed` dentro del mismo
  tenant y canal.
- [x] Aplicar las reglas de ventana de atención y plantillas de WhatsApp cuando
  la conversación esté fuera de la ventana permitida.
- [x] Mostrar en los chats el origen y nombre del canal, por ejemplo
  `Web · Sitio principal` o `WhatsApp · Ventas Colombia`.
- [x] Mantener una sola bandeja para widget y WhatsApp, filtrada mediante
  `agent_channels`; el transporte de salida se determina automáticamente.
- [x] Incorporar conexión, estado, número y asignación de agentes de WhatsApp en
  **Configuración > Canales**.
- [x] Registrar auditoría de creación, actualización, desconexión y rotación de
  credenciales de WhatsApp.
- [x] Probar dos empresas con números diferentes y verificar que un mensaje o
  respuesta nunca use el canal, agentes ni credenciales de la otra empresa.

Flujo obligatorio de entrada:

```text
Webhook del proveedor
→ phone_number_id / identificador de conexión
→ whatsapp_connections
→ channel_id + company_id
→ contacto y chat aislados
→ sala de agentes asignados al canal
```

Flujo obligatorio de salida:

```text
Respuesta del agente
→ chat.channel_id
→ whatsapp_connections
→ credenciales y número del canal
→ API del proveedor
```

**Criterio de cierre:** agentes autorizados ven en una bandeja unificada los
chats web y WhatsApp de sus canales, y ninguna operación entrante o saliente
puede cruzar empresas, números o credenciales.

### Fase 7 — Departamentos y enrutamiento

- [x] Crear departamentos opcionales por empresa.
- [x] Asignar agentes a departamentos y canales.
- [x] Permitir que un chat indique departamento o intención.
- [x] Definir estrategia de distribución: todos, menos ocupado o asignación
  directa.
- [x] Definir fallback cuando no haya agentes disponibles.
- [x] Mantener el aislamiento de empresa en todas las reglas.

**Criterio de cierre:** ventas y soporte pueden recibir colas diferentes sin
mezclar empresas ni canales.

### Fase 8 — Hardening y salida a producción

- [x] Agregar auditoría de cambios de empresa, canal y permisos.
- [x] Agregar límites de uso y protección contra abuso del widget público.
- [x] Revisar CORS, CSP, encabezados de seguridad y configuración de iframe.
- [x] Cifrar secretos de proveedores externos en reposo.
- [x] Definir rotación de secretos y respuesta a incidentes.
- [ ] Ejecutar pruebas E2E con dos empresas en navegadores separados.
- [x] Verificar backups y restauración de datos multiempresa.
- [x] Añadir métricas segmentadas por empresa y canal.
- [x] Realizar revisión final de autorización antes del despliegue.

**Criterio de cierre:** suite completa en verde, prueba manual de aislamiento y
procedimiento documentado de despliegue, rollback y rotación de claves.

### Fase 9 — Onboarding mínimo de empresas

- [x] Crear registro público de empresa y administrador.
- [x] Crear automáticamente el primer canal web y su clave pública.
- [x] Asignar el administrador al canal inicial.
- [x] Iniciar sesión automáticamente después del registro.
- [x] Permitir crear, editar, activar y desactivar agentes.
- [x] Permitir asignar agentes a canales de su propia empresa.
- [x] Mostrar el código de instalación del widget en la vista del canal.
- [x] Verificar el recorrido real contra PostgreSQL.

**Criterio de cierre:** una empresa nueva puede registrarse, entrar al panel,
copiar el widget y crear su equipo sin modificar manualmente la base de datos.

## Matriz inicial de permisos

| Acción | Visitante | Agente | Supervisor | Administrador |
|---|---:|---:|---:|---:|
| Ver sus propios chats | Sí | N/A | N/A | N/A |
| Crear chat en su canal | Sí | N/A | N/A | N/A |
| Ver cola del canal asignado | No | Sí | Sí | Sí |
| Atender chat del canal asignado | No | Sí | Sí | Sí |
| Ver todos los chats de la empresa | No | No | Según política | Sí |
| Configurar canales | No | No | No | Sí |
| Asignar agentes | No | No | Según política | Sí |
| Acceder a otra empresa | No | No | No | No |

Esta matriz debe convertirse en policies reutilizables y pruebas automatizadas.

## Registro de avance

Actualizar esta sección al terminar cada bloque.

| Fecha | Fase | Cambio | Validación | Estado |
|---|---|---|---|---|
| 2026-09-09 | Planificación | Se definió la hoja de ruta multiempresa | Revisión del modelo actual y comparación con canales/agentes de JivoChat | Completado |
| 2026-09-09 | Fase 0 | Inventario, matriz de permisos y fixtures para dos empresas | `npm test` del backend | Completado |
| 2026-09-09 | Fase 1 | Empresas, canales, claves públicas y migración de usuarios; eliminación total de `widgetId` | 4 migraciones aplicadas; 28 pruebas backend, 7 del widget, build frontend y auditoría con 0 vulnerabilidades | Completado |
| 2026-09-09 | Fase 2 | Chats ligados obligatoriamente a empresa/canal; repositorio y operaciones HTTP/Socket aislados por tenant | 36 chats migrados sin nulos; constraints compuestos; 33 pruebas backend, 7 del widget, build frontend y auditoría con 0 vulnerabilidades | Completado |
| 2026-09-09 | Fase 3 | Asignaciones agente-canal, roles de gestión, policy central y salas de soporte segmentadas | 9 asignaciones migradas; 41 pruebas backend, 7 del widget y build frontend; restricciones empresa/canal verificadas | Completado |
| 2026-09-10 | Fase 4 | Identidades anónimas derivadas, orígenes por canal, rate limits, aserciones HMAC de un uso y rotación/revocación | 46 pruebas backend, 7 del widget, build frontend, prueba real 200/401 de replay, rechazo 403 de orígenes y auditoría con 0 vulnerabilidades | Completado |
| 2026-09-10 | Planificación Fase 6 | Se priorizó WhatsApp multiempresa antes de departamentos: conexión por canal/número, adaptador de proveedor y bandeja unificada web + WhatsApp | Comparación del modelo actual con el patrón de canales y agentes asignados de JivoChat | Planificado |
| 2026-09-10 | Fase 5 | Vista administrativa de canales, orígenes, modos de autenticación, credenciales, agentes y auditoría | 55 pruebas backend, build frontend y API real en ejecución | Completado |
| 2026-09-10 | Fase 6 | Conexiones cifradas de WhatsApp por empresa/canal, webhook firmado e idempotente, proveedor Meta, ventana de 24 h y bandeja unificada | 3 migraciones aplicadas, 55 pruebas backend, build frontend, salud 200 y webhook desconocido rechazado | Completado |
| 2026-09-10 | Fase 7 | Departamentos opcionales, asignaciones por empresa, intención del visitante, distribución broadcast/directa/menos ocupado y fallback configurable | Esquema real verificado, 60 pruebas backend, build frontend y endpoint protegido con 401 | Completado |
| 2026-09-10 | Fase 8 | Encabezados, límites, validación de producción, métricas, backup/restore, runbook y revisión de autorización | 65 pruebas backend, build frontend, auditorías npm con 0 vulnerabilidades, headers reales y restauración temporal con conteos verificados | En progreso: falta E2E manual en dos navegadores |
| 2026-09-10 | Fase 9 | Registro autoservicio, empresa, administrador, canal inicial y gestión básica de agentes | 67 pruebas backend, build frontend y recorrido real de registro/login/creación de agente contra PostgreSQL | Completado |

## Próximo paso exacto

Completar el último control pendiente de la **Fase 8 — Hardening y salida a producción**:

1. Preparar dos empresas y dos cuentas reales de prueba.
2. Ejecutar widget y panel de agente en navegadores separados.
3. Verificar aislamiento de chats, adjuntos y números WhatsApp y registrar el resultado.

## Prompt breve para retomar el trabajo

```text
Continúa la implementación de MULTITENANCY_ROADMAP.md desde el primer elemento
pendiente. Antes de modificar código, revisa el estado real del repositorio y el
registro de avance. Trabaja una fase a la vez, prioriza aislamiento multiempresa
y autorización por recurso, agrega pruebas negativas y actualiza el documento
al finalizar cada bloque. No avances de fase hasta cumplir su criterio de cierre.
```
