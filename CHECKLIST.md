# Checklist de Profesionalizacion

Este documento convierte el analisis del proyecto en un plan ejecutable para llevarlo a un nivel profesional de produccion.

La implementación específica de aislamiento por empresa, canales, asignación de
agentes e identidad segura del widget se gestiona en
[`MULTITENANCY_ROADMAP.md`](MULTITENANCY_ROADMAP.md).

## Como usar este checklist

- Ejecutar el trabajo por fases, de arriba hacia abajo.
- No avanzar a fases posteriores sin cerrar los riesgos criticos de seguridad.
- Marcar cada item solo cuando tenga implementacion, validacion y documentacion minima.
- Si una tarea toca frontend y backend, definir primero el contrato compartido.

## Fase 1. Estabilizacion Critica

### Seguridad y autenticacion
- [x] Reemplazar el sistema de token actual por JWT seguro con `AUTH_SECRET` dedicado.
- [x] Eliminar cualquier fallback inseguro para autenticacion.
- [x] Proteger todas las rutas HTTP con autenticacion.
- [x] Crear middleware o helper comun para autorizacion por rol.
- [ ] Validar autorizacion por recurso en chats, mensajes, adjuntos y quick phrases.
- [x] Corregir permisos en eventos socket como `messages:get` y `messages:mark-read`.
- [x] Agregar rate limiting en login, uploads, webhook y endpoints publicos.
- [x] Validar payloads con esquemas formales en Fastify.
- [x] Sanitizar inputs y evitar errores que expongan informacion sensible.

### Robustez operativa
- [ ] Estandarizar respuestas HTTP de exito y error.
- [x] Centralizar manejo de errores del backend.
- [ ] Estandarizar logging estructurado con `requestId`, `userId`, `chatId` y `socketId`.
- [ ] Bajar logs ruidosos de consola a `debug` o eliminarlos.

### Consistencia del negocio
- [ ] Definir reglas formales para estados de chat: `pending`, `active`, `on_hold`, `closed`.
- [ ] Definir reglas formales para estados de mensaje: `sent`, `delivered`, `read`.
- [ ] Revisar transiciones validas entre estados.
- [ ] Revisar consistencia de unread counts en web, DM, grupos y global.

## Fase 2. Profesionalizar Arquitectura

### Backend
- [ ] Organizar el backend por modulos de dominio.
- [ ] Separar rutas HTTP de casos de uso y servicios.
- [ ] Separar handlers de Socket.IO de la logica de negocio.
- [ ] Crear servicios o use cases para:
- [ ] Auth
- [ ] Support chat
- [ ] Collaboration
- [ ] Attachments
- [ ] WhatsApp
- [ ] AI assist
- [ ] Mantener repositorios solo para persistencia.
- [ ] Crear una capa reusable de policies o authorization checks.

### Frontend
- [ ] Reducir el tamano y las responsabilidades del store principal.
- [ ] Separar stores por dominio funcional.
- [ ] Mover logica compleja de vistas a composables especializados.
- [ ] Reducir acoplamiento entre vistas, store y socket service.
- [ ] Limpiar metodos legacy del cliente socket que ya no representan la API real.

### Contratos compartidos
- [ ] Crear carpeta o paquete `shared` para DTOs y contratos.
- [ ] Tipar eventos socket de cliente-servidor.
- [ ] Tipar DTOs HTTP de auth, chat, mensajes y adjuntos.
- [ ] Tipar enums y estados compartidos.

## Fase 3. Base de Datos y Persistencia

- [ ] Sustituir `ensureSchema` como mecanismo principal por migraciones formales.
- [ ] Elegir herramienta de migraciones.
- [ ] Mover cambios incrementales del esquema a archivos versionados.
- [ ] Revisar constraints, claves foraneas e indices.
- [ ] Revisar consultas lentas o repetidas.
- [ ] Redisenar `quick_phrases` para que sean por usuario, por rol o por organizacion.
- [ ] Definir estrategia de auditoria y retencion.
- [ ] Crear base de datos o esquema de testing.

## Fase 4. Testing y Calidad

### Backend
- [ ] Mantener tests unitarios actuales.
- [ ] Agregar tests de integracion para login y registro.
- [ ] Agregar tests de integracion para creacion, asignacion, transferencia y cierre de chats.
- [ ] Agregar tests de permisos para HTTP y sockets.
- [ ] Agregar tests de adjuntos y quick phrases.
- [ ] Agregar tests de webhook de WhatsApp con mocks.

### Frontend
- [ ] Agregar tests unitarios para stores.
- [ ] Agregar tests unitarios para composables.
- [ ] Agregar tests de componentes criticos.
- [ ] Agregar tests E2E para flujos principales.

### Calidad automatizada
- [ ] Configurar ESLint.
- [ ] Configurar Prettier.
- [ ] Asegurar `type-check` como paso obligatorio.
- [ ] Agregar hooks pre-commit.
- [ ] Ejecutar lint, test y build en CI.

## Fase 5. Frontend y UX

- [ ] Mejorar manejo visual de reconexion y desconexion.
- [ ] Mejorar estados vacios y mensajes de error.
- [ ] Estandarizar feedback de carga, envio y fallo.
- [ ] Revisar experiencia movil.
- [ ] Revisar accesibilidad basica.
- [ ] Revisar consistencia visual entre vistas de agente y cliente.
- [ ] Mejorar experiencia de historial y filtros.

## Fase 6. DevOps y Produccion

- [ ] Configurar CI para backend y frontend.
- [ ] Crear estrategia de ambientes: `dev`, `staging`, `prod`.
- [ ] Documentar variables de entorno por ambiente.
- [ ] Agregar monitoreo de errores con Sentry o equivalente.
- [ ] Agregar health checks y alertas.
- [ ] Definir backups y recuperacion.
- [ ] Establecer rotacion de secretos.
- [ ] Hacer auditoria periodica de dependencias.

## Fase 7. Documentacion y Gobierno Tecnico

- [ ] Actualizar README del backend para reflejar la arquitectura real.
- [ ] Actualizar README del frontend para reflejar el flujo real.
- [ ] Documentar eventos Socket.IO realmente soportados.
- [ ] Documentar setup local paso a paso.
- [ ] Crear guia de arquitectura.
- [ ] Crear ADRs para decisiones grandes.
- [ ] Crear runbook de incidentes basicos.

## Fase 8. Producto y Operacion

- [ ] Definir metricas de soporte clave.
- [ ] Medir tiempo de primera respuesta.
- [ ] Medir duracion promedio de chat.
- [ ] Medir tasa de cierre.
- [ ] Medir satisfaccion.
- [ ] Crear dashboard operativo basico.
- [ ] Priorizar roadmap por impacto y riesgo.

## Priorizacion Recomendada

### Critico
- [ ] Auth y autorizacion
- [ ] Permisos de sockets y rutas HTTP
- [ ] Proteccion de adjuntos
- [ ] Validacion de payloads
- [ ] Migraciones formales

### Alto
- [ ] Tests de integracion
- [ ] Refactor modular backend
- [ ] Contratos compartidos
- [ ] Observabilidad y CI

### Medio
- [ ] Refactor del store principal
- [ ] Limpieza UX
- [ ] Documentacion avanzada

### Bajo
- [ ] Optimizaciones de interfaz no criticas
- [ ] Mejoras cosmeticas secundarias

## Roadmap 30 / 60 / 90 dias

### Primeros 30 dias
- [ ] Blindar auth y autorizacion.
- [ ] Proteger rutas HTTP y sockets.
- [ ] Agregar validacion de payloads.
- [ ] Proteger adjuntos y quick phrases.
- [ ] Configurar lint, CI minima y convenciones.

### Primeros 60 dias
- [ ] Introducir migraciones formales.
- [ ] Escribir tests de integracion backend.
- [ ] Tipar contratos compartidos.
- [ ] Refactorizar backend por modulos.
- [ ] Agregar observabilidad basica.

### Primeros 90 dias
- [ ] Refactorizar frontend por dominios.
- [ ] Agregar tests E2E.
- [ ] Completar documentacion tecnica.
- [ ] Consolidar staging y checklist de release.

## Prompt Operativo Para Continuar Este Proyecto

```text
Actua como arquitecto de software senior, ingeniero full-stack y responsable de hardening de produccion para este proyecto de chat.

Tu objetivo es profesionalizar el sistema sin romper funcionalidades existentes. Trabaja por fases, priorizando seguridad, mantenibilidad, pruebas y despliegue estable.

Reglas de ejecucion:
1. Inspecciona primero el estado real del codigo antes de proponer cambios.
2. Prioriza siempre:
   - seguridad y autorizacion
   - consistencia de datos
   - cobertura de pruebas
   - arquitectura modular
   - experiencia de desarrollo
3. No rehagas todo desde cero si puede mejorarse de forma incremental.
4. Cada cambio debe incluir:
   - objetivo
   - riesgo mitigado
   - archivos afectados
   - validacion realizada
5. Cuando detectes deuda tecnica, clasificala por:
   - critica
   - alta
   - media
   - baja
6. Si una mejora afecta backend y frontend, define contrato compartido.
7. Si una pieza esta documentada pero no coincide con el codigo, confia en el codigo y propone actualizar la documentacion.
8. Manten compatibilidad con el flujo actual del producto siempre que sea posible.

Orden de trabajo:
1. Blindar autenticacion y autorizacion.
2. Proteger rutas HTTP y eventos socket por recurso y rol.
3. Formalizar validacion de payloads y manejo de errores.
4. Introducir migraciones de base de datos.
5. Refactorizar backend por modulos y casos de uso.
6. Refactorizar frontend para reducir acoplamiento del store principal.
7. Anadir tests unitarios, de integracion y E2E.
8. Configurar CI/CD, observabilidad y documentacion tecnica.

Entregables esperados:
- checklist actualizado
- plan por fases
- implementacion incremental
- validacion tecnica de cada fase
- resumen final con riesgos restantes
```

## Siguiente Paso Recomendado

El mejor siguiente paso es ejecutar primero una fase de hardening:

1. Implementar auth y autorizacion seria.
2. Cerrar permisos de adjuntos, quick phrases y lectura de mensajes.
3. Anadir validacion formal de payloads.
4. Dejar listo el primer bloque de tests de integracion.
