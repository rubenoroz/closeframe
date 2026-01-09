import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
    try {
        const { cloudAccountId, files } = await req.json();

        if (!cloudAccountId || !files || !Array.isArray(files)) {
            return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
        }

        if (files.length === 0) {
            return NextResponse.json({ error: "No se seleccionaron archivos" }, { status: 400 });
        }

        // 1. Get Cloud Account and tokens
        const account = await prisma.cloudAccount.findUnique({
            where: { id: cloudAccountId },
        });

        if (!account || !account.accessToken) {
            return NextResponse.json({ error: "Cuenta de nube no encontrada" }, { status: 404 });
        }

        // 2. Setup Google Auth
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
        });

        const tokenInfo = await auth.getAccessToken();
        const currentToken = tokenInfo.token;

        if (!currentToken) throw new Error("Could not get access token");

        if (currentToken !== account.accessToken) {
            await prisma.cloudAccount.update({
                where: { id: account.id },
                data: { accessToken: currentToken }
            });
        }

        const drive = google.drive({ version: "v3", auth });

        // CASE 1: Single file download (Skip ZIP for better UX)
        if (files.length === 1) {
            const file = files[0];
            const response = await drive.files.get(
                { fileId: file.id, alt: "media" },
                { responseType: "arraybuffer" }
            );

            const mimeType = response.headers["content-type"] || "application/octet-stream";

            return new NextResponse(new Uint8Array(response.data as ArrayBuffer), {
                headers: {
                    "Content-Type": mimeType,
                    "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
                },
            });
        }

        // CASE 2: Batch download (ZIP)
        const zip = new JSZip();
        const downloadPromises = files.map(async (file: { id: string; name: string }) => {
            try {
                const response = await drive.files.get(
                    { fileId: file.id, alt: "media" },
                    { responseType: "arraybuffer" }
                );
                zip.file(file.name, response.data as ArrayBuffer);
            } catch (err) {
                console.error(`Error downloading file ${file.name}:`, err);
            }
        });

        await Promise.all(downloadPromises);

        const zipContent = await zip.generateAsync({ type: "nodebuffer" });

        return new NextResponse(new Uint8Array(zipContent), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="Closeframe_Batch.zip"`,
            },
        });

    } catch (error: any) {
        console.error("Download Service Error:", error);
        return NextResponse.json({ error: "Error al descargar" }, { status: 500 });
    }
}
