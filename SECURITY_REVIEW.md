# Revisión final de autorización

Fecha: 2026-09-10

## Límites de confianza verificados

- Toda sesión contiene `companyId`; las sesiones del widget también contienen
  `channelId` derivado de una clave registrada.
- Los clientes solo pueden acceder a sus chats dentro de su empresa y canal.
- Los agentes requieren asignación al canal y, cuando aplica, al departamento.
- Supervisores y administradores tienen alcance empresarial, nunca global.
- Chats, canales, departamentos, asignaciones, conexiones WhatsApp y métricas
  filtran por `company_id` en el servidor.
- Los webhooks derivan empresa y canal de la conexión almacenada y validan la
  firma antes de procesar contenido.
- Los adjuntos se autorizan contra el chat antes de leerse o modificarse.
- Los tokens HTTP solo se aceptan mediante `Authorization: Bearer`; no se
  aceptan en la URL.

## Controles activos

- Rate limits separados para login, registro, IA, IP, canal e identidad widget.
- CSP, HSTS en producción, `nosniff`, política de permisos, protección de frame
  para la API y respuestas sin caché.
- Validación de configuración segura antes de iniciar en producción.
- Credenciales WhatsApp cifradas con AES-256-GCM.
- Auditoría de canales, permisos, departamentos y conexiones WhatsApp.
- Métricas accesibles solo para administrador o supervisor y filtradas por la
  empresa autenticada.

## Validación pendiente antes del despliegue

- Completar la prueba manual con dos empresas reales en navegadores separados,
  incluyendo widget, agente, adjuntos y dos números de WhatsApp.
- Rotar cualquier secreto que haya estado alguna vez en el historial de Git.

## Verificación automatizada

- Backend: 65 pruebas aprobadas.
- Frontend: comprobación de tipos y compilación de producción aprobadas.
- Dependencias: `npm audit` reporta 0 vulnerabilidades tanto en backend como en
  frontend después de actualizar las dependencias compatibles.
