import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
    try {
        const { cloudAccountId, files } = await req.json();
        console.log(`[DOWNLOAD] Request received for ${files?.length} files. Account: ${cloudAccountId}`);

        if (!cloudAccountId || !files || !Array.isArray(files)) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
        }

        if (files.length === 0) {
            return NextResponse.json({ error: "No se seleccionaron archivos" }, { status: 400 });
        }

        // 1. Get Cloud Account info
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account) {
            console.error("[DOWNLOAD] Cloud account not found");
            return NextResponse.json({ error: "Cuenta de nube no encontrada" }, { status: 404 });
        }

        // 2. Get Fresh Auth Client
        const { getFreshAuth } = await import("@/lib/cloud/auth-factory");
        const authClient = await getFreshAuth(cloudAccountId);
        console.log(`[DOWNLOAD] Auth client obtained for provider: ${account.provider}`);

        // Helper to download a single file buffer
        const downloadFileBuffer = async (fileId: string): Promise<ArrayBuffer | null> => {
            try {
                if (account.provider === "google") {
                    const { google } = await import("googleapis");
                    const drive = google.drive({ version: "v3", auth: authClient as any });
                    const response = await drive.files.get(
                        { fileId: fileId, alt: "media" },
                        { responseType: "arraybuffer" }
                    );
                    return response.data as ArrayBuffer;

                } else if (account.provider === "microsoft") {
                    console.log(`[DOWNLOAD] Downloading Microsoft file: ${fileId}`);
                    const { MicrosoftGraphProvider } = await import("@/lib/cloud/microsoft-provider");
                    const provider = new MicrosoftGraphProvider(authClient as string);
                    // Get short-lived download URL
                    const downloadUrl = await provider.getFileContent(fileId);
                    if (!downloadUrl) throw new Error("No download URL found");

                    // Fetch content
                    const response = await fetch(downloadUrl);
                    if (!response.ok) throw new Error("Failed to download file content");
                    return await response.arrayBuffer();
                }
            } catch (error) {
                console.error(`Error downloading file ${fileId}:`, error);
                return null;
            }
            return null;
        };


        // CASE 1: Single file download (Skip ZIP for better UX)
        if (files.length === 1) {
            const file = files[0];
            const buffer = await downloadFileBuffer(file.id);

            if (!buffer) {
                return NextResponse.json({ error: "Error al descargar el archivo" }, { status: 500 });
            }

            // Simple mime detection or default
            const mimeType = file.name.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream";

            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": mimeType,
                    "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
                },
            });
        }

        // CASE 2: Batch download (ZIP)
        const zip = new JSZip();
        // Limit concurrency to avoid timeouts or rate limits
        // Processing in chunks of 5
        const chunkSize = 5;
        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);
            const promises = chunk.map(async (file: { id: string; name: string }) => {
                try {
                    const buffer = await downloadFileBuffer(file.id);
                    if (buffer) {
                        zip.file(file.name, buffer);
                    } else {
                        zip.file(file.name + "_ERROR.txt", "Error: Could not download file. Check permissions or try again.");
                    }
                } catch (e: any) {
                    zip.file(file.name + "_ERROR.txt", `Error: ${e.message}`);
                }
            });
            await Promise.all(promises);
        }

        const zipContent = await zip.generateAsync({ type: "nodebuffer" });

        return new NextResponse(new Uint8Array(zipContent), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="Closerlens_Batch.zip"`,
            },
        });

    } catch (error: any) {
        console.error("Download Service Error:", error);
        return NextResponse.json({ error: "Error al descargar" }, { status: 500 });
    }
}
