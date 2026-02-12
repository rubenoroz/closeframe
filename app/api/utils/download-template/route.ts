import { NextResponse } from "next/server";
import JSZip from "jszip";

export async function GET() {
   try {
      const zip = new JSZip();

      // Carpetas Raíz - Usando los nombres sugeridos por el usuario
      const standard = zip.folder("Nombre Galeria");
      const closer = zip.folder("Nombre Galeria Closer");

      // ====== ESTILO 1: NOMBRE GALERÍA (STANDARD) ======
      // Estructura: Fotografias -> Calidades
      const stdPhotos = standard?.folder("Fotografias");

      const stdQualities = ["webjpg", "jpg", "raw"];
      stdQualities.forEach(q => stdPhotos?.folder(q)?.file(".keep", ""));
      stdPhotos?.file("full_gallery.zip", "Reemplaza con el ZIP de todas las fotos.");

      const stdVideos = standard?.folder("Videos");
      const videoQualities = ["webmp4", "hd", "alta"];
      videoQualities.forEach(q => stdVideos?.folder(q)?.file(".keep", ""));

      // ====== ESTILO 2: NOMBRE GALERÍA CLOSER (EDITORIAL) ======
      // Estructura: Secciones -> Calidades (Híbrido)
      const sections = ["01_Highlights", "02_Ceremonia", "03_Recepcion"];

      sections.forEach(section => {
         const secFolder = closer?.folder(section);
         const qualities = ["webjpg", "jpg", "raw"];
         qualities.forEach(q => secFolder?.folder(q)?.file(".keep", ""));
         secFolder?.file("full_gallery.zip", "Reemplaza con el ZIP de las fotos de esta sección.");
      });

      // NOTA: En estilo Closer NO agregamos carpeta "Videos" separada
      // porque es una galería híbrida donde el video convive con la foto.

      // ====== LEEME ======
      const readmeContent = `GUÍA DE ORGANIZACIÓN - CLOSERLENS
=========================================================================

Tienes dos formas de organizar tu trabajo. Elige la carpeta que prefieras y úsala como plantilla.

OPCIÓN 1: "Nombre Galeria" (Estilo Standard)
--------------------------------------------
Usar cuando: Quieres una galería tradicional.
- Separa FOTOS de VIDEOS en carpetas distintas.
- Estructura:
   Nombre Galeria/
      ├── Fotografias/      <-- Tu carpeta principal de fotos
      │      ├── webjpg/
      │      ├── jpg/
      │      └── raw/
      └── Videos/           <-- Tu carpeta de videos


OPCIÓN 2: "Nombre Galeria Closer" (Estilo Editorial / Híbrido)
----------------------------------------------------
Usar cuando: Quieres contar una historia fluida (Closer).
- NO necesita carpeta de videos separada (es híbrido).
- Estructura por Momentos:
   Nombre Galeria Closer/
      ├── 01_Highlights/    <-- Sección 1
      │      ├── webjpg/
      │      └── ...
      ├── 02_Ceremonia/     <-- Sección 2
      │      ├── webjpg/
      │      └── ...
      └── 03_Recepcion/     <-- Sección 3...

=========================================================================
NOTAS IMPORTANTES:
- No cambies los nombres de las subcarpetas "webjpg", "jpg", "raw", "webmp4".
- El archivo "full_gallery.zip" sirve para habilitar la descarga en un solo clic.
=========================================================================
`;

      zip.file("LEEME_PRIMERO.txt", readmeContent);

      const content = await zip.generateAsync({ type: "nodebuffer" });

      const filename = "Plantilla_Estructura_Closerlens.zip";

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
