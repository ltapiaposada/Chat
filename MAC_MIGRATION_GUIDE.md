# Guía para continuar el proyecto en macOS

Esta guía sirve para mover el proyecto desde Windows a un Mac usando el archivo
`Chat-migration.zip`. El ZIP contiene el código, los `.env` privados y el
respaldo de la base de datos en `database/subZero.dump`.

## 1. Copiar y descomprimir

1. Transfiere `Chat-migration.zip` al Mac usando una ubicación privada.
2. Descomprímelo en una carpeta de trabajo, por ejemplo `~/Development/Chat`.
3. Abre Terminal y entra en la carpeta descomprimida:

```bash
cd ~/Development/Chat/Chat-migration
```

No subas el ZIP ni los archivos `.env` a GitHub, Drive público o un chat. Incluyen
credenciales de servicios y de la base de datos.

## 2. Instalar las herramientas

Instala Homebrew si el Mac no lo tiene:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Instala Node.js, PostgreSQL y FFmpeg. FFmpeg es necesario para procesar notas de
audio adjuntas en el chat.

```bash
brew install node postgresql@18 ffmpeg
brew services start postgresql@18
```

Si Homebrew no ofrece `postgresql@18`, instala la versión disponible con:

```bash
brew install postgresql
brew services start postgresql
```

Comprueba la instalación:

```bash
node --version
npm --version
psql --version
ffmpeg -version
```

## 3. Preparar PostgreSQL

El backend usa los valores de `chat-backend/.env`. Crea el rol y la base que
espera esa configuración:

```bash
createuser -s postgres
createdb -O postgres subZero
psql postgres -c "\\password postgres"
```

Cuando `psql` pida la nueva contraseña, utiliza exactamente el valor `DB_PASSWORD`
de `chat-backend/.env`.

Restaura la base de datos:

```bash
PGPASSWORD="$(grep '^DB_PASSWORD=' chat-backend/.env | cut -d '=' -f2-)" \
pg_restore --clean --if-exists --no-owner --dbname=subZero database/subZero.dump
```

Verifica que se restauró:

```bash
PGPASSWORD="$(grep '^DB_PASSWORD=' chat-backend/.env | cut -d '=' -f2-)" \
psql -h localhost -U postgres -d subZero -c "SELECT COUNT(*) AS usuarios FROM users;"
```

Si el rol `postgres` ya existe o prefieres otro usuario, actualiza `DB_USER` y
`DB_PASSWORD` en `chat-backend/.env` para que coincidan con tu instalación local.

## 4. Instalar dependencias

En una terminal:

```bash
cd ~/Development/Chat/Chat-migration/chat-backend
npm install
```

En otra terminal:

```bash
cd ~/Development/Chat/Chat-migration/chat-frontend
npm install
```

No copies `node_modules` desde Windows: macOS necesita instalar sus propios
binarios y dependencias.

## 5. Ejecutar y comprobar

Terminal 1, backend:

```bash
cd ~/Development/Chat/Chat-migration/chat-backend
npm run dev
```

Debe indicar que PostgreSQL se conectó y que el servidor escucha en el puerto
`3000`.

Terminal 2, frontend:

```bash
cd ~/Development/Chat/Chat-migration/chat-frontend
npm run dev
```

Abre `http://localhost:5173` y prueba iniciar sesión antes de borrar el proyecto
del PC anterior.

## 6. Si falla

1. Confirma que PostgreSQL esté en ejecución: `brew services list`.
2. Confirma que `chat-backend/.env` exista y tenga `AUTH_SECRET` y los datos de
   base correctos.
3. Ejecuta `npm test` dentro de `chat-backend`.
4. Ejecuta `npm run build` dentro de `chat-frontend`.
5. Si el backend no encuentra FFmpeg, ejecuta `which ffmpeg` y coloca esa ruta en
   `FFMPEG_PATH` dentro de `chat-backend/.env`.
