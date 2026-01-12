
import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        GOOGLE_REDIRECT_URI_CONSTRUCTED: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/google/callback`,
        GOOGLE_CLIENT_ID_PREFIX: process.env.GOOGLE_CLIENT_ID?.substring(0, 15),
        NODE_ENV: process.env.NODE_ENV,
    });
}
