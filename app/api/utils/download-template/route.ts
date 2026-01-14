import { NextResponse } from "next/server";
import JSZip from "jszip";

export async function GET() {
    try {
        const zip = new JSZip();

        // Crear estructura de carpetas completa
        // Carpeta raíz de ejemplo
        const root = zip.folder("MiGaleria");

        // ====== FOTOGRAFÍAS ======
        const fotografias = root?.folder("Fotografias");
        fotografias?.folder("webjpg")?.file(".keep", "");
        fotografias?.folder("jpg")?.file(".keep", "");
        fotografias?.folder("raw")?.file(".keep", "");

        // ====== VIDEOS ======
        const videos = root?.folder("Videos");
        videos?.folder("webmp4")?.file(".keep", "");
        videos?.folder("hd")?.file(".keep", "");
        videos?.folder("alta")?.file(".keep", "");

        // Crear LEEME.txt con instrucciones claras
        const readmeContent = `GUÍA DE ORGANIZACIÓN DE ARCHIVOS - TUSET
=========================================================================

Esta estructura te permite organizar tus galerías de forma profesional,
separando fotografías y videos con sus diferentes calidades.

=========================================================================
ESTRUCTURA DE CARPETAS
=========================================================================

📁 MiGaleria/                    ← Carpeta raíz (renómbrala con el nombre del evento)
│
├── 📁 Fotografias/              ← Selecciona esta carpeta como "Carpeta de Fotos"
│   ├── 📁 webjpg/               ← Versiones web optimizadas (1600-2000px)
│   ├── 📁 jpg/                  ← Alta resolución para descarga
│   └── 📁 raw/                  ← Archivos RAW originales (opcional)
│
└── 📁 Videos/                   ← Selecciona esta carpeta como "Carpeta de Videos"
    ├── 📁 webmp4/               ← Videos comprimidos para web (720p)
    ├── 📁 hd/                   ← Videos HD para descarga (1080p)
    └── 📁 alta/                 ← Videos máxima calidad (4K, ProRes, etc.)

=========================================================================
INSTRUCCIONES PARA FOTOGRAFÍAS
=========================================================================

1. CARPETA 'webjpg'
   - Qué poner: Versiones ligeras/optimizadas para web (ej. 1600px o 2000px lado largo)
   - Formato: .jpg
   - Uso: Son las que el cliente verá en la galería online (cargan rápido)
   - Ejemplo: Boda_Ana_Juan_001.jpg

2. CARPETA 'jpg'
   - Qué poner: Versiones finales en ALTA resolución
   - Formato: .jpg
   - Uso: Son las que el cliente descargará cuando pida "Alta Resolución"
   - Ejemplo: Boda_Ana_Juan_001.jpg  <-- ¡MISMO NOMBRE!

3. CARPETA 'raw' (Opcional)
   - Qué poner: Archivos originales de cámara (RAW)
   - Formato: .CR2, .NEF, .ARW, .DNG, etc.
   - Uso: Para respaldo o entrega de crudos
   - Ejemplo: Boda_Ana_Juan_001.CR2  <-- ¡MISMO NOMBRE BASE!

=========================================================================
INSTRUCCIONES PARA VIDEOS
=========================================================================

1. CARPETA 'webmp4'
   - Qué poner: Videos comprimidos para reproducción web rápida
   - Formato: .mp4 (H.264, 720p recomendado)
   - Uso: Son los que el cliente verá en la galería online
   - Ejemplo: Highlights_001.mp4

2. CARPETA 'hd'
   - Qué poner: Videos en calidad HD para descarga
   - Formato: .mp4 (H.264/H.265, 1080p)
   - Uso: Opción "Descargar Baja" en la galería
   - Ejemplo: Highlights_001.mp4  <-- ¡MISMO NOMBRE!

3. CARPETA 'alta'
   - Qué poner: Videos en máxima calidad
   - Formato: .mp4, .mov, ProRes, etc. (4K o superior)
   - Uso: Opción "Descargar Alta" en la galería
   - Ejemplo: Highlights_001.mov  <-- ¡MISMO NOMBRE BASE!

=========================================================================
¡REGLA DE ORO: NOMBRES IDÉNTICOS!
=========================================================================

El sistema usa el nombre del archivo para vincular las diferentes calidades.

✅ CORRECTO:
   webjpg/foto_001.jpg  →  jpg/foto_001.jpg  →  raw/foto_001.CR2
   webmp4/video_001.mp4 →  hd/video_001.mp4  →  alta/video_001.mov

❌ INCORRECTO:
   webjpg/foto_pequeña.jpg vs jpg/IMG_9999.jpg (nombres diferentes)

Tip: Usa Lightroom para exportar renombrando tus archivos en secuencia.

=========================================================================
CONFIGURACIÓN EN TUSET
=========================================================================

Al crear tu galería:
1. Selecciona la carpeta "Fotografias" como carpeta de fotos
2. Activa la pestaña de Videos solo si tienes videos
3. Si activas videos, selecciona la carpeta "Videos" como carpeta de videos

¡La pestaña de Videos solo aparecerá si detectamos la carpeta Videos!
`;

        zip.file("LEEME_ORGANIZACION.txt", readmeContent);

        const content = await zip.generateAsync({ type: "nodebuffer" });

        const filename = "Plantilla_Estructura_TuSet.zip";

        return new NextResponse(new Uint8Array(content), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(content.byteLength),
            },
        });

    } catch (error) {
        console.error("Template Gen Error:", error);
        return NextResponse.json({ error: "Error generando plantilla" }, { status: 500 });
    }
}

