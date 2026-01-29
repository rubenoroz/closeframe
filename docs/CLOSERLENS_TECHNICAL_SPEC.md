# Closerlens: Especificación Técnica y Funcional Completa

## 1. Resumen Ejecutivo
Closerlens es una plataforma SaaS diseñada para fotógrafos profesionales, estudios creativos y agencias. Su misión es simplificar la entrega de galerías, la gestión de clientes y la organización de proyectos, funcionando como una capa de presentación premium sobre el almacenamiento en la nube (Google Drive). Se diferencia por su estética "High-End", su integración fluida con la nube y sus herramientas de productividad (Kanban, CRM ligero).

## 2. Stack Tecnológico (Construcción)
El proyecto está construido sobre una arquitectura moderna, escalable y Serverless.

**Frontend & Framework:** Next.js 16 (App Router, Turbopack) con React Server Components.
**Lenguaje:** TypeScript (Tipado estático estricto).
**Estilos y UI:**
*   Tailwind CSS: Para utilidades de diseño rápido.
*   Framer Motion: Para animaciones fluidas, transiciones de página y micro-interacciones premium.
*   Lucide React: Iconografía consistente y ligera.
*   Glassmorphism: Estética de "cristal" en componentes UI.

**Backend & Base de Datos:**
*   Vercel Postgres (Supabase): Base de datos relacional PostgreSQL gestionada.
*   Prisma ORM: Capa de abstracción de base de datos para manejo de modelos y migraciones.
*   Vercel Server Actions: Lógica de servidor ejecutada directamente desde componentes.

**Almacenamiento (La clave):**
*   Google Drive API V3: El almacenamiento no es propio, sino que se conecta al Drive del fotógrafo. Closerlens actúa como un indexador y visor.
*   Proxy Streaming: Sistema propio para descargar archivos desde Drive sin exponer tokens y manejando grandes volúmenes de datos.

**Autenticación:**
*   Auth.js v5 (NextAuth): Sistema de autenticación híbrido.
*   Providers: Google OAuth (Social Login) y Resend (Magic Links por email).

**Seguridad:** Tokens encriptados, sesiones JWT, protección CSRF.

**Infraestructura:**
*   Vercel: Hosting, CI/CD, Edge Networks.
*   Resend: Servicio transaccional de emails (Magic Links).

## 3. Funcionalidades Clave (Features)

### A. Galerías de Cliente (El Core)
*   **Sincronización con Drive:** El fotógrafo sube fotos a una carpeta en su Google Drive y Closerlens genera la galería automáticamente. No hay "doble carga".
*   **Descarga Directa Inteligente:**
    *   Sistema optimizado que permite descargar galerías completas (ZIP) o selecciones sin saturar la memoria del navegador.
    *   Convierte streams de Google Drive en descargas directas para el usuario final.
*   **Diseño Premium:** Interfaz oscura, minimalista, enfocada en la fotografía.
*   **Selección y Favoritos:** Los clientes pueden seleccionar fotos para retoque o impresión.
*   **Protección:** Galerías protegidas por contraseña, marcas de agua (watermarking), bloqueo por expiración.

### B. Gestión de Negocio (Business Tools)
*   **CRM Ligero (Bookings):** Gestión de reservas, clientes, fechas de sesión y estados (Pendiente, Confirmado, Entregado).
*   **Scena (Gestor de Proyectos):** Un tablero Kanban (tipo Trello) integrado específicamente para flujos de trabajo fotográficos (Pre-producción, Shooting, Edición, Entrega).
*   **Perfil Público:** Página de "Bio" para el fotógrafo con enlaces sociales, portafolio y formulario de contacto.

### C. Sistema de Cuentas y Planes
*   **SaaS Tiered:** Soporte para planes (Free, Pro, Studio).
*   **Límites Inteligentes:** El sistema gestiona cuántas galerías activas puede tener un usuario según su plan, archivando las antiguas en lugar de borrarlas.

## 4. Habilidades del Sistema (Capacidades Técnicas)
*   **Streaming de Archivos Grandes:** Capacidad de procesar descargas de ZIPs de 500MB+ sin almacenar los archivos en el servidor intermedio.
*   **Generación de Miniaturas:** Optimización de imágenes al vuelo para carga rápida en móviles (600px).
*   **Auth Híbrida:** Permite que un usuario unifique su cuenta de Google y su cuenta de Email sin duplicidad.
*   **Dark Mode Nativo:** Toda la interfaz está diseñada en modo oscuro para resaltar el contenido visual.

## 5. Herramientas de Desarrollo Integradas
*   **Vercel CLI:** Para despliegues atómicos y previews.
*   **Git:** Control de versiones.
*   **ESLint/TypeScript:** Calidad de código garantizada.

## 6. Propuesta de Valor para Marketing
*   **"Tu nube, tu galería":** Ahorra costos usando el almacenamiento que ya pagas (Google Drive) en lugar de pagar extra por gigas en otra plataforma.
*   **"Entrega más rápido":** Sube a Drive y la galería ya está lista.
*   **"Impresiona a tus clientes":** La experiencia de descarga y visualización es superior a un simple enlace de Drive o Dropbox.
