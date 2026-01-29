import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import JSZip from "jszip";

// Función auxiliar para procesar la descarga (compartida por GET y POST)
async function processDownload(
    cloudAccountId: string,
    filesData: { id: string; name: string }[],
    projectName: string,
    format: string
) {
    if (!cloudAccountId || !filesData || filesData.length === 0) {
        return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
    });

    if (!account || !account.accessToken) {
        return NextResponse.json({ error: "Cuenta de nube no encontrada" }, { status: 404 });
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
    const currentToken = tokenInfo.token;
    if (currentToken && currentToken !== account.accessToken) {
        await prisma.cloudAccount.update({
            where: { id: account.id },
            data: { accessToken: currentToken }
        });
    }

    const drive = google.drive({ version: "v3", auth });

    // Lógica ZIP siempre (para simplificar browser compatibility)
    const zip = new JSZip();
    const downloadPromises = filesData.map(async (file) => {
        try {
            const response = await drive.files.get(
                { fileId: file.id, alt: "media" },
                { responseType: "arraybuffer" }
            );
            // Asegurar nombre único dentro del zip
            zip.file(file.name, response.data as ArrayBuffer);
        } catch (err) {
            console.error(`Error downloading file ${file.name}:`, err);
            zip.file(`${file.name}_ERROR.txt`, `Error descarga: ${String(err)}`);
        }
    });

    await Promise.all(downloadPromises);

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    // Nombre limpio pero dinámico
    const safeProjectName = projectName ? projectName.replace(/[^a-zA-Z0-9-_]/g, "_") : "Galeria";
    const timestamp = new Date().getTime();
    const filename = `${safeProjectName}_${format.toUpperCase()}_${timestamp}.zip`;

    console.log(`[API Download] Generado: ${filename}`);

    return new NextResponse(new Uint8Array(zipContent), {
        status: 200,
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}

// Handler GET
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const cloudAccountId = searchParams.get("c");
        const filesJson = searchParams.get("f"); // IDs y nombres encoded
        const projectName = searchParams.get("p") || "Closerlens";
        const format = searchParams.get("fmt") || "JPG";

        if (!filesJson) return NextResponse.json({ error: "No files" }, { status: 400 });

        // Decodificar files de un formato compacto: "id1:name1,id2:name2"
        // O más simple, esperar JSON stringified en URL (cuidado con longitud)
        let filesData;
        try {
            filesData = JSON.parse(filesJson);
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        return processDownload(cloudAccountId!, filesData, projectName, format);
    } catch (error) {
        console.error("GET Download Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const cloudAccountId = formData.get("cloudAccountId") as string;
        const filesJson = formData.get("files") as string;
        const projectName = formData.get("projectName") as string || "Closerlens_Gallery";
        const format = formData.get("format") as string || "JPG";

        const filesData = JSON.parse(filesJson);
        return processDownload(cloudAccountId, filesData, projectName, format);
    } catch (error: any) {
        console.error("POST Download Service Error:", error);
        return NextResponse.json({ error: "Error al descargar" }, { status: 500 });
    }
}
