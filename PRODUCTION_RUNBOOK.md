# Operación segura y salida a producción

## Requisitos previos

- Usar HTTPS en frontend, API y webhooks.
- Configurar `NODE_ENV=production`.
- Usar valores aleatorios distintos, de 32 caracteres o más, para
  `AUTH_SECRET` y `WHATSAPP_CREDENTIALS_KEY`.
- Usar credenciales PostgreSQL exclusivas y `DB_SSL=true` cuando el proveedor
  lo soporte.
- Definir `CLIENT_URL` y `CORS_ORIGINS` con orígenes HTTPS exactos.
- Mantener `.env` fuera de Git y almacenar secretos en el gestor del proveedor.

El backend rechaza el arranque si detecta secretos débiles, credenciales por
defecto, orígenes locales o HTTP en producción.

## Despliegue

1. Ejecutar `npm ci` en backend y frontend.
2. Ejecutar `npm test` dentro de `chat-backend`.
3. Ejecutar `npm run build` dentro de `chat-frontend`.
4. Crear un backup con `npm run db:backup`.
5. Ejecutar `npm run migrate:up` una sola vez antes de levantar las réplicas.
6. Iniciar el backend con `npm start` y servir `chat-frontend/dist` por HTTPS.
7. Verificar `/`, inicio de sesión, widget, webhook y métricas administrativas.

## Rollback

1. Detener tráfico de escritura.
2. Volver a la versión anterior de la aplicación.
3. Si la migración no es compatible, restaurar el backup en una base vacía o
   ejecutar `npm run migrate:down` únicamente después de revisar la migración.
4. Validar conteos por `company_id`, canales y chats antes de reabrir tráfico.

Nunca ejecutar una restauración sobre producción sin backup reciente y ventana
de mantenimiento. El comando exige confirmación explícita:

```bash
npm run db:restore -- /ruta/chat-fecha.dump --confirm
```

## Backup y prueba de restauración

- Programar `npm run db:backup` diariamente fuera del servidor principal.
- Cifrar el archivo resultante y conservar al menos una copia en otra región.
- Verificar cada backup con `pg_restore --list archivo.dump`.
- Hacer una restauración mensual en una base temporal y comparar conteos de
  `companies`, `channels`, `users`, `chats`, `messages` y conexiones WhatsApp.
- Registrar fecha, duración, responsable y resultado de cada simulacro.

## Rotación de secretos

- Rotar `AUTH_SECRET` obliga a cerrar sesiones activas; hacerlo en una ventana
  anunciada.
- Rotar `WHATSAPP_CREDENTIALS_KEY` requiere descifrar y volver a cifrar las
  credenciales antes de retirar la clave anterior.
- Los tokens de Meta se rotan desde Configuración > Canales. Después se valida
  un webhook firmado y un mensaje saliente.
- Las claves de canal se rotan desde la misma vista; las aserciones anteriores
  quedan revocadas.

## Respuesta a incidentes

1. Desactivar el canal o conexión afectada.
2. Revocar el token en el proveedor externo.
3. Rotar credenciales, claves de canal y sesiones si corresponde.
4. Revisar `admin_audit_logs` por empresa, actor, canal y fecha.
5. Preservar logs sin copiar tokens ni contenido sensible.
6. Documentar alcance, empresas afectadas, corrección y acciones preventivas.

## Verificación multiempresa

Antes de producción se deben usar dos cuentas reales de prueba en navegadores
separados y comprobar que ninguna puede listar, tomar, descargar adjuntos ni
responder chats de la otra empresa. También deben probarse dos números de
WhatsApp diferentes y firmas inválidas.
