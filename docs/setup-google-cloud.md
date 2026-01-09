# Guía de Configuración: Google Cloud OAuth

Para que tu aplicación "TuSet" pueda conectarse a Google Drive, necesitas registrarla en Google. Esto es un requisito de seguridad de Google.

## Paso 1: Crear Proyecto
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un **Nuevo Proyecto** (llámalo "TuSet Gallery").

## Paso 2: Habilitar API de Drive
1. En el menú, busca "APIs y Servicios" > "Biblioteca".
2. Busca **"Google Drive API"**.
3. Haz clic en **Habilitar**.

## Paso 3: Configurar Pantalla de Consentimiento
1. Ve a "APIs y Servicios" > **"Pantalla de consentimiento de OAuth"**.
2. Selecciona **Externo** (o Interno si tienes Google Workspace).
3. Rellena los datos básicos (Nombre de App: "TuSet", tu email).
4. En **Permisos**, añade:
   - `.../auth/drive.readonly` (Ver archivos de Drive)
   - `.../auth/userinfo.email` (Ver email del usuario)
5. En **Usuarios de prueba**, añade tu propio correo de Gmail (importante mientras la app no esté verificada).

## Paso 4: Crear Credenciales (Las Llaves)
1. Ve a "APIs y Servicios" > **"Credenciales"**.
2. Haz clic en **"Crear Credenciales"** > **"ID de cliente de OAuth"**.
3. Tipo de aplicación: **Aplicación Web**.
4. Nombre: "TuSet Web".
5. **Orígenes autorizados de JavaScript**: `http://localhost:3000`
6. **URI de redireccionamiento autorizados**: `http://localhost:3000/api/connect/google/callback`
7. Haz clic en **Crear**.

## Paso 5: Copiar al archivo .env
Google te mostrará dos códigos:
- **ID de Cliente** -> Copia esto en `GOOGLE_CLIENT_ID` en tu archivo `.env`.
- **Secreto de Cliente** -> Copia esto en `GOOGLE_CLIENT_SECRET` en tu archivo `.env`.
