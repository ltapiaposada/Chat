# Migración a otro PC

El archivo `migration/Chat-migration.zip` contiene el código actual, los archivos
de configuración locales y el respaldo de la base de datos `subZero`.

## Restaurar en el nuevo PC

1. Instala Node.js LTS y PostgreSQL 18 (o una versión compatible).
2. Descomprime `Chat-migration.zip` en una carpeta de trabajo.
3. Crea una base de datos llamada `subZero` y un usuario PostgreSQL con los
   valores indicados en `chat-backend/.env`.
4. Restaura el respaldo:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --clean --if-exists --no-owner --dbname=subZero .\database\subZero.dump
```

5. Instala las dependencias y ejecuta los dos servicios en terminales separadas:

```powershell
cd .\chat-backend
npm install
npm run dev
```

```powershell
cd .\chat-frontend
npm install
npm run dev
```

6. Abre `http://localhost:5173` y verifica el inicio de sesión antes de borrar
   el proyecto original.

El archivo `.env` del respaldo contiene credenciales. Mantén el ZIP en una
ubicación privada y no lo subas a repositorios ni servicios públicos.
