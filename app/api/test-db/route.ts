
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const count = await prisma.calendarAccount.count();
        return NextResponse.json({ success: true, count });
    } catch (error) {
        console.error('Test DB Error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
