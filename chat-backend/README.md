# Chat Backend

Backend para aplicación de chat construido con Fastify y Clean Architecture.

## Estructura del Proyecto

```
chat-backend/
├── src/
│   ├── domain/              # Capa de Dominio (núcleo del negocio)
│   │   ├── entities/        # Entidades y modelos de negocio
│   │   ├── repositories/    # Interfaces de repositorios
│   │   └── usecases/        # Casos de uso / reglas de negocio
│   ├── application/         # Capa de Aplicación
│   │   ├── services/        # Servicios de aplicación
│   │   └── dtos/            # Data Transfer Objects
│   ├── infrastructure/      # Capa de Infraestructura
│   │   ├── database/        # Conexiones y configuración de BD
│   │   ├── repositories/    # Implementaciones de repositorios
│   │   └── external/        # Servicios externos (APIs, etc.)
│   ├── presentation/        # Capa de Presentación
│   │   ├── controllers/     # Controladores
│   │   ├── routes/          # Definición de rutas
│   │   └── middlewares/     # Middlewares
│   ├── config/              # Configuración general
│   └── server.js            # Punto de entrada
├── package.json
└── README.md
```

## Requisitos Previos

- Node.js (v14 o superior)
- PostgreSQL (v12 o superior)

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
# Copiar el archivo de ejemplo
copy .env.example .env

# Editar .env con tus credenciales de PostgreSQL
```

3. Crear la base de datos:
```sql
-- Conectarse a PostgreSQL y ejecutar:
CREATE DATABASE chat_db;
```

4. Inicializar las tablas:
```bash
# Conectarse a la base de datos y ejecutar el script:
psql -U postgres -d chat_db -f src/infrastructure/database/init.sql
```

## Uso

### Modo desarrollo (con auto-reload)
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Tecnologías

- **Fastify**: Framework web rápido y eficiente
- **Socket.IO**: Comunicación bidireccional en tiempo real
- **PostgreSQL**: Base de datos relacional

## Base de Datos

Este proyecto utiliza PostgreSQL con las siguientes tablas:

- **users**: Usuarios del sistema
- **rooms**: Salas de chat
- **messages**: Mensajes enviados en las salas
- **room_members**: Relación usuarios-salas

Revisa `src/infrastructure/database/init.sql` para ver el esquema completo.

## Socket.IO

El servidor implementa Socket.IO para mensajería en tiempo real. Eventos disponibles:

**Cliente → Servidor:**
- `authenticate`: Autenticar usuario
- `join:room`: Unirse a una sala
- `leave:room`: Salir de una sala
- `message:send`: Enviar mensaje
- `typing:start/stop`: Indicadores de escritura

**Servidor → Cliente:**
- `message:new`: Nuevo mensaje
- `user:joined/left`: Usuario unió/salió
- `user:typing/stopped-typing`: Estado de escritura

Revisa `SOCKET_EVENTS.md` para documentación completa.

### Cliente de Prueba

Abre `test-client.html` en tu navegador para probar la funcionalidad de Socket.IO.

## Clean Architecture

Este proyecto sigue los principios de Clean Architecture:

- **Domain**: Contiene la lógica de negocio pura, independiente de frameworks
- **Application**: Orquesta los casos de uso del dominio
- **Infrastructure**: Implementaciones concretas (base de datos, APIs externas)
- **Presentation**: Capa de entrada (rutas, controladores, middlewares de Fastify)

## Despliegue en Render

Este repo incluye `render.yaml` en la raiz para crear:
- servicio web `chat-backend` (Node)
- base de datos PostgreSQL `chat-postgres`

Variables clave en Render (servicio backend):
- `DATABASE_URL`: se conecta desde `chat-postgres`
- `CLIENT_URL`: URL del frontend en Vercel (por ejemplo `https://tu-app.vercel.app`)
- `CORS_ORIGINS`: origenes adicionales separados por coma (opcional)
- `ALLOW_VERCEL_PREVIEWS=true`: permite previews `*.vercel.app`
- `GEMINI_*`, `WHATSAPP_*`, `CLOUDINARY_URL`: segun los servicios usados

Notas:
- El backend ahora soporta `DATABASE_URL` y SSL (`DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`).
- CORS y Socket.IO comparten la misma validacion de origenes.
