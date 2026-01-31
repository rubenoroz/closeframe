import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/superadmin/collaborative
 * List all collaborative galleries with stats.
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const galleries = await prisma.collaborativeGallery.findMany({
        include: {
            project: {
                include: {
                    user: { select: { id: true, email: true, name: true, businessName: true } }
                }
            },
            sections: {
                include: {
                    _count: { select: { uploads: true } }
                }
            },
            _count: { select: { uploads: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(
        galleries.map(g => ({
            id: g.id,
            projectId: g.projectId,
            projectName: g.project.name,
            owner: {
                id: g.project.user.id,
                email: g.project.user.email,
                name: g.project.user.name || g.project.user.businessName,
            },
            isActive: g.isActive,
            totalUploads: g._count.uploads,
            sectionsCount: g.sections.length,
            limits: {
                maxFilesTotal: g.maxFilesTotal,
                maxFilesPerSection: g.maxFilesPerSection,
                maxFilesPerDevice: g.maxFilesPerDevice,
                maxFileSizeBytes: g.maxFileSizeBytes,
                allowVideo: g.allowVideo,
            },
            createdAt: g.createdAt,
        }))
    );
}

/**
 * PATCH /api/superadmin/collaborative
 * Override limits for a specific gallery.
 */
export async function PATCH(request: NextRequest) {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { galleryId, updates } = body;

    if (!galleryId || !updates) {
        return NextResponse.json({ error: 'galleryId and updates are required' }, { status: 400 });
    }

    // Allowed fields to update
    const allowedFields = [
        'isActive',
        'maxFilesTotal',
        'maxFilesPerSection',
        'maxFilesPerDevice',
        'maxFileSizeBytes',
        'allowVideo'
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    try {
        const updated = await prisma.collaborativeGallery.update({
            where: { id: galleryId },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            gallery: {
                id: updated.id,
                isActive: updated.isActive,
                limits: {
                    maxFilesTotal: updated.maxFilesTotal,
                    maxFilesPerSection: updated.maxFilesPerSection,
                    maxFilesPerDevice: updated.maxFilesPerDevice,
                    maxFileSizeBytes: updated.maxFileSizeBytes,
                    allowVideo: updated.allowVideo,
                }
            }
        });
    } catch (error) {
        console.error('Update failed:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}
