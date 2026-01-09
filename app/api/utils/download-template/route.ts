import { NextResponse } from "next/server";
import JSZip from "jszip";

export async function GET() {
    try {
        const zip = new JSZip();

        // Crear carpetas vacías
        // Nota: JSZip no añade carpetas vacías al ZIP final a menos que tengan contenido o se trate explícitamente.
        // Pero zip.folder() devuelve una instancia.
        // Para asegurar que se creen en al descomprimir, a veces es mejor poner un archivo .gitkeep o similar, 
        // pero probaremos solo con folder(). Si no funciona, añadiremos un placeholder oculto.

        zip.folder("webjpg")?.file(".keep", "");
        zip.folder("jpg")?.file(".keep", "");
        zip.folder("raw")?.file(".keep", "");

        // Crear LEEME.txt con instrucciones claras
        const readmeContent = `GUÍA DE ORGANIZACIÓN DE ARCHIVOS - TUSET

Para que tu galería detecte automáticamente todas las versiones de tus fotos (Web, Alta Resolución y RAW), organiza tus archivos en la nube dentro de estas 3 carpetas:

-------------------------------------------------------------------------
1. CARPETA 'webjpg'
-------------------------------------------------------------------------
- Qué poner: Versiones ligeras/optimizadas para web (ej. 1600px o 2000px lado largo).
- Formato: .jpg
- Uso: Son las que el cliente verá en la galería online (cargan rápido).
- Ejemplo: Boda_Ana_Juan_001.jpg

-------------------------------------------------------------------------
2. CARPETA 'jpg'
-------------------------------------------------------------------------
- Qué poner: Versiones finales en ALTA resolución.
- Formato: .jpg
- Uso: Son las que el cliente descargará cuando pida "Alta Resolución".
- Ejemplo: Boda_Ana_Juan_001.jpg  <-- ¡MISMO NOMBRE!

-------------------------------------------------------------------------
3. CARPETA 'raw' (Opcional)
-------------------------------------------------------------------------
- Qué poner: Archivos originales de cámara (RAW).
- Formato: .CR2, .NEF, .ARW, .DNG, etc.
- Uso: Para respaldo o entrega de crudos.
- Ejemplo: Boda_Ana_Juan_001.CR2  <-- ¡MISMO NOMBRE BASE!

-------------------------------------------------------------------------
¡REGLA DE ORO: NOMBRES IDÉNTICOS!
-------------------------------------------------------------------------
El sistema usa el nombre del archivo para saber que "Boda_001.jpg" es la misma foto que "Boda_001.CR2".
Si los nombres no coinciden (ej: "foto_pequeña.jpg" vs "IMG_9999.CR2"), se mostrarán como fotos separadas o no te dejará descargar el RAW.

Tip: Usa herramientas como Lightroom para exportar renombrando tus archivos en secuencia.
`;

        zip.file("LEEME_ORGANIZACION.txt", readmeContent);

        const content = await zip.generateAsync({ type: "nodebuffer" });

        const filename = "Plantilla_Estructura_TuSet.zip";

        return new NextResponse(content, {
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
