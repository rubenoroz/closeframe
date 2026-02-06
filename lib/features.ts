import {
    Star,
    Crown,
    LayoutGrid,
    List,
    Calendar,
    MousePointerClick,
    Shield,
    Image as ImageIcon,
    Video,
    Palette,
    Globe,
    User,
    Clock,
    Folder,
    Cloud,
    Download,
    Eye,
    BarChart3,
    Users,
    MessageSquare,
    FileText,
    CreditCard,
    Lock,
    Search,
    Zap,
    QrCode,
    Smartphone,
    Copy
} from "lucide-react";

export interface FeatureDefinition {
    id: string;
    label: string;
    description: string;
    category: 'profile' | 'gallery' | 'booking' | 'system' | 'analytics' | 'collaboration' | 'monetization' | 'scena' | 'video' | 'payments';
    type: 'boolean' | 'number' | 'select';
    icon?: any;
    defaultValue?: any;
    options?: { label: string; value: any }[];
}

// ...


export const FEATURE_POOL: FeatureDefinition[] = [
    // --- PROFILE ---
    {
        id: "publicProfile",
        label: "Perfil Público Personal",
        description: "Acceso básico al perfil público",
        category: "profile",
        type: "boolean",
        defaultValue: true,
        icon: User
    },
    {
        id: "professionalProfile",
        label: "Perfil Público Profesional",
        description: "Diseño y funciones profesionales",
        category: "profile",
        type: "boolean",
        defaultValue: false,
        icon: Star
    },
    {
        id: "bioMaxLength",
        label: "Límite de Biografía",
        description: "Caracteres máximos en la bio",
        category: "profile",
        type: "number",
        defaultValue: 150,
        icon: List
    },

    {
        id: "coverImage",
        label: "Imagen de Portada",
        description: "Personalizar fondo del perfil",
        category: "profile",
        type: "boolean",
        defaultValue: false,
        icon: ImageIcon
    },
    {
        id: "callToAction",
        label: "CTA Personalizado",
        description: "Botón de acción (Contactar, Book me)",
        category: "profile",
        type: "boolean",
        defaultValue: false,
        icon: MousePointerClick
    },
    {
        id: "customFields",
        label: "Campos Personalizados",
        description: "Rol, ciudad, equipo, etc.",
        category: "profile",
        type: "boolean",
        defaultValue: false,
        icon: List
    },
    {
        id: "maxSocialLinks",
        label: "Máx. Enlaces Sociales",
        description: "Cantidad de links externos (-1 = Ilimitado)",
        category: "profile",
        type: "number",
        defaultValue: 1,
        icon: Globe
    },
    {
        id: "advancedSocialNetworks",
        label: "Redes Sociales Avanzadas",
        description: "LinkedIn, YouTube, Web personalizada",
        category: "profile",
        type: "boolean",
        defaultValue: false,
        icon: Globe
    },


    // --- GALLERY ---
    {
        id: "hideBranding",
        label: "Ocultar Marca CloserLens",
        description: "Sin 'Powered by Closerlens'",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Crown
    },
    {
        id: "whiteLabel",
        label: "Marca Blanca Completa",
        description: "Experiencia totalmente personalizada",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Crown
    },
    {
        id: "customDomain",
        label: "Dominio Personalizado",
        description: "Usar tu propio dominio .com",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Globe
    },
    {
        id: "customUrl",
        label: "URL Personalizada",
        description: "closerlens.com/usuario",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Globe
    },
    {
        id: "manualOrdering",
        label: "Orden Manual",
        description: "Arrastrar y soltar imágenes",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: LayoutGrid
    },
    {
        id: "maxImagesPerProject",
        label: "Imágenes por Galería",
        description: "Límite de fotos por proyecto (0 = Ilimitado)",
        category: "gallery",
        type: "number",
        defaultValue: 20,
        icon: ImageIcon
    },
    {
        id: "videoGallery",
        label: "Soporte de Video",
        description: "Subida y pestaña de videos",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Video
    },
    {
        id: "embeddedVideos",
        label: "Videos Embebidos",
        description: "Vimeo / YouTube support",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Video
    },
    {
        id: "videoCover",
        label: "Video como Portada",
        description: "Usar video en header de galería",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Video
    },
    {
        id: "galleryCover",
        label: "Imagen de Portada (Galería)",
        description: "Imagen de bienvenida antes de entrar",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: ImageIcon
    },
    {
        id: "passwordProtection",
        label: "Protección con Contraseña",
        description: "Galerías privadas con clave",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Lock
    },
    {
        id: "privateLinks",
        label: "Links Privados",
        description: "Enlaces ocultos/no listados",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Lock
    },
    {
        id: "temporaryLinks",
        label: "Links Temporales",
        description: "Enlaces de un solo uso o corta duración",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Clock
    },
    {
        id: "expirationDate",
        label: "Fecha de Expiración",
        description: "Galerías que caducan automáticamente",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Clock
    },
    {
        id: "emailAccess",
        label: "Acceso por Email",
        description: "Restringir acceso a lista de correos",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Users
    },
    {
        id: "lowResDownloads",
        label: "Descargas Baja Res.",
        description: "Permitir bajar versión web",
        category: "gallery",
        type: "boolean",
        defaultValue: true,
        icon: Download
    },
    {
        id: "lowResThumbnails",
        label: "Miniaturas Baja Res.",
        description: "Carga más rápida con calidad de previsualización",
        category: "gallery",
        type: "boolean",
        defaultValue: true,
        icon: ImageIcon
    },
    {
        id: "highResDownloads",
        label: "Descargas Alta Res.",
        description: "Permitir bajar originales/HD",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Download
    },
    {
        id: "selectiveDownload",
        label: "Descarga Selectiva",
        description: "Elegir fotos específicas para bajar",
        category: "gallery",
        type: "boolean",
        defaultValue: true,
        icon: MousePointerClick
    },
    {
        id: "zipDownloadsEnabled",
        label: "Descarga ZIP Completa",
        description: "Bajar todo el proyecto en un click",
        category: "gallery",
        type: "select",
        defaultValue: false,
        icon: Folder,
        options: [
            { label: "Desactivado", value: false },
            { label: "Solo Estático (ZIP Upload)", value: "static_only" },
            { label: "Dinámico (Stream)", value: true }
        ]
    },
    {
        id: "simulatedWatermark",
        label: "Marca de Agua Simulada",
        description: "Overlay básico de protección",
        category: "gallery",
        type: "boolean",
        defaultValue: true,
        icon: Shield
    },
    {
        id: "customWatermark",
        label: "Marca de Agua Personalizada",
        description: "Usar tu propio logo como marca",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Shield
    },
    {
        id: "rightClickProtection",
        label: "Protección Click Derecho",
        description: "Evitar guardado fácil de imágenes",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Shield
    },
    {
        id: "themeToggle",
        label: "Modo Oscuro/Claro",
        description: "Visitantes pueden cambiar tema",
        category: "gallery",
        type: "boolean",
        defaultValue: true,
        icon: Palette
    },
    {
        id: "baseThemes",
        label: "Temas Base",
        description: "Acceso a temas predefinidos",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Palette
    },
    {
        id: "customFonts",
        label: "Tipografías Personalizadas",
        description: "Elegir fuentes distintas",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: FileText
    },
    {
        id: "colorPalettes",
        label: "Paletas de Colores",
        description: "Personalizar colores de la galería",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Palette
    },
    {
        id: "customLogo",
        label: "Logo Propio",
        description: "Subir logo de estudio/agencia",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: ImageIcon
    },
    {
        id: "smoothTransitions",
        label: "Transiciones Suaves",
        description: "Animaciones de interfaz mejoradas",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Zap
    },
    {
        id: "premiumAnimations",
        label: "Animaciones Premium",
        description: "Efectos visuales avanzados",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Zap
    },
    {
        id: "storytelling",
        label: "Storytelling (Texto+Img)",
        description: "Bloques de narrativa en galería",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: FileText
    },
    {
        id: "editorialDescription",
        label: "Descripción Editorial",
        description: "Textos largos estilo editorial",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: FileText
    },
    {
        id: "aiCuration",
        label: "Curaduría IA",
        description: "Selección asistida de mejores tomas",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Zap
    },
    {
        id: "viewOnlyGalleries",
        label: "Galerías Solo Ver",
        description: "Modo presentación sin descarga",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Eye
    },
    {
        id: "qrCode",
        label: "QR para Galería",
        description: "Generación automática de código QR",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: QrCode
    },
    {
        id: "duplicateGallery",
        label: "Duplicar Galería",
        description: "Permitir duplicar proyectos existentes",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Copy
    },

    {
        id: "collections",
        label: "Colecciones",
        description: "Agrupar galerías (bodas, moda, etc)",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: Folder
    },

    // --- SYSTEM / LIMITS ---
    {
        id: "maxProjects",
        label: "Límite de Galerías",
        description: "Galerías activas (-1 = Ilimitado)",
        category: "system",
        type: "number",
        defaultValue: 1,
        icon: Folder
    },
    {
        id: "maxCloudAccounts",
        label: "Nubes Enlazadas",
        description: "Cuentas Google Drive/Dropbox",
        category: "system",
        type: "number",
        defaultValue: 1,
        icon: Cloud
    },
    {
        id: "prioritySupport",
        label: "Soporte Prioritario",
        description: "Atención preferencial",
        category: "system",
        type: "boolean",
        defaultValue: false,
        icon: Users
    },
    {
        id: "humanSupport",
        label: "Soporte Humano",
        description: "Gerente de cuenta dedicado",
        category: "system",
        type: "boolean",
        defaultValue: false,
        icon: Users
    },
    {
        id: "duplicateDetection",
        label: "Detección Duplicados",
        description: "Aviso de archivos repetidos",
        category: "system",
        type: "boolean",
        defaultValue: false,
        icon: Search
    },
    {
        id: "seoNoIndex",
        label: "No-Index SEO",
        description: "Ocultar de Google",
        category: "system",
        type: "boolean",
        defaultValue: false,
        icon: Search
    },
    {
        id: "seoControl",
        label: "Control SEO Total",
        description: "Meta tags personalizados",
        category: "system",
        type: "boolean",
        defaultValue: false,
        icon: Search
    },
    {
        id: "assistMigration",
        label: "Migración Asistida",
        description: "Ayuda para mover contenido",
        category: "system",
        type: "boolean",
        defaultValue: false,
        icon: Folder
    },
    {
        id: "gdprCompliance",
        label: "Cumplimiento GDPR",
        description: "Herramientas de privacidad UE",
        category: "system",
        type: "boolean",
        defaultValue: false,
        icon: Shield
    },

    // --- ANALYTICS ---
    {
        id: "basicInsights",
        label: "Insights Básicos",
        description: "Vistas generales",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: BarChart3
    },
    {
        id: "advancedInsights",
        label: "Insights Avanzados",
        description: "Analíticas detalladas",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: BarChart3
    },
    {
        id: "galleryAnalytics",
        label: "Vistas por Galería",
        description: "Conteo de visitas por proyecto",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: Eye
    },
    {
        id: "imageAnalytics",
        label: "Vistas por Imagen",
        description: "Qué fotos se ven más",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: ImageIcon
    },
    {
        id: "downloadAnalytics",
        label: "Tracking Descargas",
        description: "Registro de descargas",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: Download
    },
    {
        id: "geoAnalytics",
        label: "Geolocalización",
        description: "País/Ciudad del visitante",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: Globe
    },
    {
        id: "linkTracking",
        label: "Tracking por Link",
        description: "Rendimiento por enlace compartido",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: BarChart3
    },
    {
        id: "exportAnalytics",
        label: "Exportar Estadísticas",
        description: "Descargar reportes CSV/PDF",
        category: "analytics",
        type: "boolean",
        defaultValue: false,
        icon: FileText
    },

    // --- COLLABORATION ---
    {
        id: "teams",
        label: "Equipos",
        description: "Espacios de trabajo compartidos",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: Users
    },
    {
        id: "roles",
        label: "Roles y Permisos",
        description: "Admin, Editor, Viewer",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: Shield
    },
    {
        id: "guestCollaborators",
        label: "Colaboradores Invitados",
        description: "Acceso externo a proyectos",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: Users
    },
    {
        id: "privateComments",
        label: "Comentarios Privados",
        description: "Notas internas del equipo",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: MessageSquare
    },
    {
        id: "imageComments",
        label: "Comentarios en Imagen",
        description: "Feedback sobre fotos específicas",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: MessageSquare
    },
    {
        id: "visualFeedback",
        label: "Feedback Visual",
        description: "Dibujar/marcar sobre imágenes",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: Palette
    },
    {
        id: "approvals",
        label: "Flujos de Aprobación",
        description: "Selección y visto bueno de cliente",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: List
    },
    {
        id: "versioning",
        label: "Versionado",
        description: "Historial de versiones de archivos",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: Clock
    },
    {
        id: "changeHistory",
        label: "Historial de Cambios",
        description: "Log de actividad del proyecto",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: List
    },
    {
        id: "sharedGalleries",
        label: "Galerías Compartidas",
        description: "Entre equipos de la organización",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: Users
    },
    {
        id: "scenaAccess",
        label: "Acceso Scena Board",
        description: "Acceso al gestor de proyectos",
        category: "scena",
        type: "boolean",
        defaultValue: false,
        icon: LayoutGrid
    },
    {
        id: "maxScenaProjects",
        label: "Límite Proyectos Scena",
        description: "Límite de tableros propios (0 = Solo invitado)",
        category: "scena",
        type: "number",
        defaultValue: 0,
        icon: Folder
    },

    {
        id: "imageSelection",
        label: "Selección de Imágenes",
        description: "Cliente selecciona favoritas",
        category: "collaboration",
        type: "boolean",
        defaultValue: false,
        icon: Crown
    },

    // --- MONETIZATION / BOOKING ---
    {
        id: "stripeIntegration",
        label: "Integración Stripe",
        description: "Cobros con tarjeta",
        category: "monetization",
        type: "boolean",
        defaultValue: false,
        icon: CreditCard
    },
    {
        id: "paypalIntegration",
        label: "Integración PayPal",
        description: "Cobros vía PayPal",
        category: "monetization",
        type: "boolean",
        defaultValue: false,
        icon: CreditCard
    },
    {
        id: "customStripePayments",
        label: "Stripe Personalizado",
        description: "Pasarela propia conectada",
        category: "monetization",
        type: "boolean",
        defaultValue: false,
        icon: CreditCard
    },
    {
        id: "coupons",
        label: "Cupones de Descuento",
        description: "Crear códigos promocionales",
        category: "monetization",
        type: "boolean",
        defaultValue: false,
        icon: Zap
    },
    {
        id: "bookingConfig",
        label: "Config. Reservas",
        description: "Sistema de citas online",
        category: "booking",
        type: "boolean",
        defaultValue: false,
        icon: Calendar
    },
    {
        id: "bookingWindow",
        label: "Ventana Reserva",
        description: "Semanas disponibles (0=∞)",
        category: "booking",
        type: "number",
        defaultValue: 4,
        icon: Calendar
    },
    {
        id: "bookingPayments",
        label: "Pago por Booking",
        description: "Cobrar al reservar",
        category: "booking",
        type: "boolean",
        defaultValue: false,
        icon: CreditCard
    },
    {
        id: "castingPayments",
        label: "Pagos por Casting",
        description: "Cobros específicos casting",
        category: "monetization",
        type: "boolean",
        defaultValue: false,
        icon: Users
    },
    {
        id: "contracts",
        label: "Contratos Descargables",
        description: "Adjuntar PDF contratos",
        category: "monetization",
        type: "boolean",
        defaultValue: false,
        icon: FileText
    },
    {
        id: "store",
        label: "Tienda / Venta",
        description: "Venta de impresiones o digital",
        category: "monetization",
        icon: CreditCard,
        type: "boolean",
        defaultValue: false
    },

    // --- CLOSER GALLERIES (Premium) ---
    {
        id: "closerGalleries",
        label: "Galerías Closer",
        description: "Galerías profesionales con todas las funciones premium",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: ImageIcon
    },
    {
        id: "collaborativeGalleries",
        label: "Galerías Colaborativas QR",
        description: "Invitados suben fotos vía código QR a tu Drive",
        category: "gallery",
        type: "boolean",
        defaultValue: false,
        icon: QrCode
    },

    // --- CALENDAR SYNC (Pro+) ---
    {
        id: "calendarSync",
        label: "Sincronización de Calendario",
        description: "Conectar Google Calendar o Microsoft Outlook",
        category: "booking",
        type: "boolean",
        defaultValue: false,
        icon: Calendar
    }
];

// Helper to avoid icon import errors
const CheckBoxIconPlaceholder = List;
