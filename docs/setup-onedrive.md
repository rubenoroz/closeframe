# Configuración de Azure AD para OneDrive

## Paso 1: Crear la Aplicación

1. Ve a [Azure Portal - App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click en **"+ New registration"** (arriba a la izquierda)
3. Llena el formulario:
   - **Name**: `Closeframe OneDrive` (o el nombre que quieras)
   - **Supported account types**: Selecciona **"Accounts in any organizational directory and personal Microsoft accounts"** (la tercera opción)
   - **Redirect URI**: 
     - Tipo: **Web**
     - URL: `http://localhost:3000/api/connect/onedrive/callback` (para desarrollo)
4. Click **"Register"**

---

## Paso 2: Obtener Credenciales

Después de crear la app, estarás en la página "Overview":

1. **Application (client) ID**: Copia este valor → será tu `MICROSOFT_CLIENT_ID`
2. Ve al menú izquierdo → **"Certificates & secrets"**
3. En la sección "Client secrets", click **"+ New client secret"**
   - Description: `Closeframe Secret`
   - Expires: Selecciona `24 months` o lo que prefieras
4. Click **"Add"**
5. **IMPORTANTE**: Copia inmediatamente el **Value** (no el Secret ID) → será tu `MICROSOFT_CLIENT_SECRET`
   > ⚠️ Este valor solo se muestra una vez. Si lo pierdes, tendrás que crear uno nuevo.

---

## Paso 3: Configurar Permisos (API Permissions)

1. Ve al menú izquierdo → **"API permissions"**
2. Click **"+ Add a permission"**
3. Selecciona **"Microsoft Graph"**
4. Selecciona **"Delegated permissions"**
5. Busca y selecciona estos permisos:
   - `Files.Read` - Leer archivos del usuario
   - `Files.Read.All` - Leer todos los archivos
   - `User.Read` - Leer perfil básico (ya debería estar)
6. Click **"Add permissions"**

> Nota: No necesitas "Grant admin consent" para cuentas personales.

---

## Paso 4: Agregar Variables de Entorno

Agrega estas variables a tu `.env.local`:

```env
MICROSOFT_CLIENT_ID=tu-application-client-id
MICROSOFT_CLIENT_SECRET=tu-client-secret-value
```

---

## Paso 5: Agregar Redirect URI de Producción

Cuando estés listo para producción:

1. Ve a **"Authentication"** en el menú izquierdo
2. En "Redirect URIs", click **"Add URI"**
3. Agrega: `https://tu-dominio.com/api/connect/onedrive/callback`
4. Click **"Save"**

---

## Resumen de Valores Obtenidos

| Variable | Dónde encontrarla |
|----------|-------------------|
| `MICROSOFT_CLIENT_ID` | Overview → Application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Certificates & secrets → Client secret → Value |

---

## Siguiente Paso

Una vez que tengas estas credenciales, avísame y procederé a implementar:
1. El provider de OneDrive (`lib/cloud/onedrive-provider.ts`)
2. Las rutas de OAuth (`/api/connect/onedrive/...`)
3. La integración con las APIs existentes
