import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import JSZip from "jszip";
import sharp from "sharp";

// Esta ruta captura cualquier llamada a /api/cloud/dl/LO_QUE_SEA.zip
// El "LO_QUE_SEA.zip" es ignorado por la lógica, pero usado por el navegador para nombrar el archivo.
export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;
        const { searchParams } = new URL(req.url);
        const cloudAccountId = searchParams.get("c");
        const filesJson = searchParams.get("f");

        if (!cloudAccountId || !filesJson) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        // --- Lógica de Descarga Replicada ---
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account || !account.accessToken) {
            return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
        }

        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
        });

        const tokenInfo = await auth.getAccessToken();
        if (tokenInfo.token && tokenInfo.token !== account.accessToken) {
            await prisma.cloudAccount.update({
                where: { id: account.id },
                data: { accessToken: tokenInfo.token }
            });
        }

        const drive = google.drive({ version: "v3", auth });
        const filesData = JSON.parse(filesJson);
        const zip = new JSZip();

        const size = searchParams.get("s");
        const resizeWidth = size ? parseInt(size) : null;

        // Procesar archivos
        await Promise.all(filesData.map(async (file: any) => {
            try {
                // 1. Siempre descargar el ORIGINAL (fiable)
                // Usamos byte array para poder procesarlo en memoria
                const response = await drive.files.get(
                    { fileId: file.id, alt: "media" },
                    { responseType: "arraybuffer" }
                );

                let fileBuffer = Buffer.from(response.data as ArrayBuffer);

                // 2. Si se pide resize, procesar con SHARP
                if (resizeWidth) {
                    try {
                        // Detectar si es imagen soportada por sharp antes de intentar
                        fileBuffer = await sharp(fileBuffer)
                            .resize({
                                width: resizeWidth,
                                height: resizeWidth, // Set both to force 'long edge' behavior
                                withoutEnlargement: true,
                                fit: 'inside'
                            })
                            // Convertir a JPEG para asegurar consistencia
                            .toFormat('jpeg', { quality: 85 })
                            .toBuffer() as unknown as Buffer;
                    } catch (sharpError) {
                        console.error(`Sharp resize error for ${file.name}:`, sharpError);
                        // Fallback: usar original si falla el resize (mejor que nada/corrupto)
                    }
                }

                zip.file(file.name, fileBuffer);
            } catch (err) {
                console.error(`Error processing file ${file.name}:`, err);
                zip.file(`${file.name}_ERROR.txt`, String(err));
            }
        }));

        // Usar compression: "STORE" para no comprimir. 
        // 1. Es mucho más rápido (evita timeouts con RAWs grandes).
        // 2. Archivos JPG/RAW ya están comprimidos o no ganan mucho, no vale la pena el gasto de CPU.
        const zipContent = await zip.generateAsync({
            type: "nodebuffer",
            compression: "STORE"
        });

        // Sanitize filename for Content-Disposition header (ASCII only)
        const sanitizedFilename = filename
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
            .replace(/[^\x00-\x7F]/g, '_'); // Replace non-ASCII with underscore

        // Retornar ZIP
        return new NextResponse(zipContent, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
                "Cache-Control": "no-store"
            }
        });

    } catch (error: any) {
        console.error("DL Route Error:", error?.message || error);
        console.error("DL Route Stack:", error?.stack);
        return NextResponse.json({ error: "Server Error", details: error?.message }, { status: 500 });
    }
}
