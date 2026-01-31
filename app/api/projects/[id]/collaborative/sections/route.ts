import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createQrSection } from '@/lib/services/collaborative.service';

/**
 * GET /api/projects/[id]/collaborative/sections
 * List all QR sections for a collaborative gallery.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const sections = await prisma.qrSection.findMany({
        where: {
            gallery: {
                projectId,
                project: { userId: session.user.id }
            }
        },
        include: {
            _count: { select: { uploads: { where: { status: 'success' } } } }
        },
        orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(
        sections.map(s => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            isActive: s.isActive,
            uploadCount: s._count.uploads,
            accessCount: s.accessCount,
            createdAt: s.createdAt,
        }))
    );
}

/**
 * POST /api/projects/[id]/collaborative/sections
 * Create a new QR section.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Section name is required' }, { status: 400 });
    }

    // Find collaborative gallery
    const collaborativeGallery = await prisma.collaborativeGallery.findFirst({
        where: {
            projectId,
            project: { userId: session.user.id }
        }
    });

    if (!collaborativeGallery) {
        return NextResponse.json(
            { error: 'Collaborative gallery not found. Enable it first.' },
            { status: 404 }
        );
    }

    try {
        const section = await createQrSection(collaborativeGallery.id, name.trim());

        // Generate upload URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://closerlens.com';
        const uploadUrl = `${baseUrl}/upload/${section.slug}`;

        return NextResponse.json({
            ...section,
            uploadUrl,
        });
    } catch (error) {
        console.error('Create section error:', error);
        return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }
}
