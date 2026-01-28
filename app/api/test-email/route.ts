
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

    if (!apiKey) {
        return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    try {
        const data = await resend.emails.send({
            from: fromEmail,
            to: "univa@closerlens.com", // Intentaremos enviar al dominio mismo o un hardcoded seguro si supiera el del usuario. 
            // Usaré un log para ver qué pasa, mejor enviar a un email dummy y ver el log de Vercel o que el usuario vea el json.
            // Mejor: enviar a "delivered@resend.dev" que es un sink hole seguro para testing, 
            // O mejor aún, devolveré el apiKey (parcial) para ver si se cargó.
            to: "delivered@resend.dev",
            subject: "Test Email from Closeframe Debug",
            html: "<p>Si ves esto, Resend funciona.</p>"
        });

        return NextResponse.json({
            success: true,
            data,
            config: {
                hasKey: !!apiKey,
                keyPrefix: apiKey.substring(0, 5),
                from: fromEmail
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            details: error,
            config: {
                hasKey: !!apiKey,
                from: fromEmail
            }
        }, { status: 500 });
    }
}
