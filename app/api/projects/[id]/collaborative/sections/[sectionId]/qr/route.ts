import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateQRCode, getUploadUrl } from '@/lib/services/qr.service';

/**
 * GET /api/projects/[id]/collaborative/sections/[sectionId]/qr
 * Generate and return QR code image.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, sectionId } = await params;

    // Verify ownership and get section
    const section = await prisma.qrSection.findFirst({
        where: {
            id: sectionId,
            gallery: {
                projectId,
                project: { userId: session.user.id }
            }
        }
    });

    if (!section) {
        return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    try {
        const url = getUploadUrl(section.slug);
        const qrBuffer = await generateQRCode(url);

        return new NextResponse(new Uint8Array(qrBuffer), {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="QR-${section.name.replace(/[^a-zA-Z0-9]/g, '_')}.png"`,
            },
        });
    } catch (error) {
        console.error('QR generation error:', error);
        return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
    }
}
