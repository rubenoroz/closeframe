# Guía de Puesta en Producción - Closeframe

Esta guía detalla los pasos necesarios para desplegar Closeframe en un entorno de producción (ej. Vercel) y asegurar que todas las integraciones funcionen correctamente.

## 1. Configuración de Google Cloud (OAuth)

Para que la autenticación de Google Drive funcione en tu dominio `.com` (no solo en localhost), debes actualizar la consola de Google Cloud.

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/).
2.  Selecciona tu proyecto "Closeframe" (antes TuSet).
3.  Ve a **Credenciales** > Selecciona tu **ID de cliente de OAuth 2.0**.
4.  **Orígenes autorizados de JavaScript**:
    *   Añade tu dominio de producción: `https://closeframe.com` (o el dominio que uses).
    *   Mantén `http://localhost:3000` para desarrollo.
5.  **URI de redireccionamiento autorizados**:
    *   Añade: `https://closeframe.com/api/connect/google/callback`
    *   Mantén: `http://localhost:3000/api/connect/google/callback`
6.  Guarda los cambios.

## 2. Variables de Entorno (.env)

En tu panel de Vercel (Settings > Environment Variables), asegúrate de tener las siguientes variables configuradas:

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | **CRÍTICO**: La URL base de tu sitio. | `https://closeframe.com` (Sin barra al final) |
| `AUTH_SECRET` | Secreto para firmar sesiones (genera uno largo). | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Confiar en el host (necesario para Auth.js). | `true` |
| `GOOGLE_CLIENT_ID` | Copiado de Google Cloud Console. | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Copiado de Google Cloud Console. | `GOCSPX-...` |
| `DATABASE_URL` | String de conexión a PostgreSQL. | `postgres://user:pass@host:5432/db` |

## 3. Base de Datos (Migración a PostgreSQL)

Actualmente la app usa **SQLite** (`dev.db`). Para producción, **DEBES** usar una base de datos real como PostgreSQL (recomendado: Supabase, Neon o Vercel Postgres).

### Pasos para migrar a PostgreSQL:

1.  **Provisiona una base de datos** (ej. crea un proyecto en Supabase).
2.  Obtén la `DATABASE_URL` (Connection String).
3.  **Actualiza `prisma/schema.prisma`**:

    Cambia esto:
    ```prisma
    datasource db {
      provider = "sqlite"
      url      = env("DATABASE_URL")
    }
    ```
    Por esto:
    ```prisma
    datasource db {
      provider = "postgresql" // <--- CAMBIO IMPORTANTE
      url      = env("DATABASE_URL")
    }
    ```

4.  **Borra la carpeta de migraciones antigua** (`prisma/migrations`). Al cambiar de motor de BD, es mejor reiniciar las migraciones o usar `db push` si no tienes datos críticos aún.
5.  **Ejecuta la migración inicial**:
    ```bash
    # En desarrollo, con la URL de postgres en tu .env local
    npx prisma migrate dev --name init_postgres
    ```
6.  Esto generará el SQL compatible con Postgres.
7.  Al desplegar en Vercel, asegúrate de que el comando de Build incluya `prisma generate` (Next.js lo hace automáticamente) y que uses un comando de deploy para aplicar migraciones si es necesario, o usa `npx prisma db push` en el proceso de build.

## 4. Despliegue en Vercel

1.  Conecta tu repositorio de GitHub (`rubenoroz/closeframe`).
2.  En "Build & Development Settings", el comando por defecto suele estar bien (`next build`).
3.  Añade todas las variables de entorno del paso 2.
4.  Despliega.

> **Nota**: Si al principio tienes errores 500 en las descargas, verifica que la cuenta de Google conectada no haya caducado sus credenciales. Simplemente desconecta y vuelve a conectar la nube desde `/dashboard/clouds`.
