
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getExternalEvents } from '@/lib/calendar/sync';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const startStr = searchParams.get('start');
        const endStr = searchParams.get('end');

        if (!startStr || !endStr) {
            return NextResponse.json(
                { error: 'Se requieren fechas de inicio y fin' },
                { status: 400 }
            );
        }

        const start = new Date(startStr);
        const end = new Date(endStr);

        const result = await getExternalEvents(session.user.id, start, end);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching external events:', error);
        return NextResponse.json(
            { error: 'Error al obtener eventos externos' },
            { status: 500 }
        );
    }
}
