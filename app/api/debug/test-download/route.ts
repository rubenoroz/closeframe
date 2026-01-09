import { NextResponse } from "next/server";

export async function GET() {
    const text = "Hola, esta es una prueba de descarga exitosa. Si lees esto, el navegador funciona bien.";

    return new NextResponse(text, {
        headers: {
            "Content-Type": "text/plain",
            "Content-Disposition": 'attachment; filename="prueba_tuset.txt"',
            "Content-Length": String(text.length),
            "Cache-Control": "no-store"
        }
    });
}
