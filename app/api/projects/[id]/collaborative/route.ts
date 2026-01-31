import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { enableCollaborativeGallery, isPlanEligible } from '@/lib/services/collaborative.service';

/**
 * GET /api/projects/[id]/collaborative
 * Fetch collaborative gallery status and sections.
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

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        include: {
            cloudAccount: true,
            user: { include: { plan: true } },
            collaborativeGallery: {
                include: {
                    sections: {
                        include: {
                            _count: { select: { uploads: { where: { status: 'success' } } } }
                        },
                        orderBy: { createdAt: 'asc' }
                    },
                    _count: { select: { uploads: { where: { status: 'success' } } } }
                }
            }
        }
    });

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only show feature for Google Drive AND eligible plans (Studio, Agency)
    const isGoogleDrive = project.cloudAccount.provider === 'google';
    // Check plan eligibility
    let isEligible = isPlanEligible(project.user.plan?.name);

    // [NEW] Dynamic check from Plan Configuration (Matrix)
    try {
        const planConfig = project.user.plan?.config as any;
        const planLimits = project.user.plan?.limits ? JSON.parse(project.user.plan.limits as string) : null;


        if (planConfig?.features?.collaborativeGalleries === true) {
            isEligible = true;
        } else if (planConfig?.features?.collaborativeGalleries === false) {
            isEligible = false;
        } else if (planLimits?.collaborativeGalleries === true) {
            isEligible = true;
        } else if (planLimits?.collaborativeGalleries === false) {
            isEligible = false;
        }
    } catch (e) {
        console.error("Error parsing plan config for eligibility check", e);
    }

    const hasEligiblePlan = isEligible;
    const featureAvailable = isGoogleDrive && hasEligiblePlan;

    return NextResponse.json({
        isGoogleDrive,
        hasEligiblePlan,
        featureAvailable,
        collaborativeGallery: featureAvailable && project.collaborativeGallery ? {
            id: project.collaborativeGallery.id,
            isActive: project.collaborativeGallery.isActive,
            driveFolderId: project.collaborativeGallery.driveFolderId,
            totalUploads: project.collaborativeGallery._count.uploads,
            sections: project.collaborativeGallery.sections.map(s => ({
                id: s.id,
                name: s.name,
                slug: s.slug,
                isActive: s.isActive,
                uploadCount: s._count.uploads,
                accessCount: s.accessCount,
                createdAt: s.createdAt,
            })),
            limits: {
                maxFilesTotal: project.collaborativeGallery.maxFilesTotal,
                maxFilesPerSection: project.collaborativeGallery.maxFilesPerSection,
                maxFilesPerDevice: project.collaborativeGallery.maxFilesPerDevice,
                maxFileSizeBytes: project.collaborativeGallery.maxFileSizeBytes,
                allowVideo: project.collaborativeGallery.allowVideo,
            }
        } : null
    });
}

/**
 * POST /api/projects/[id]/collaborative
 * Enable collaborative gallery (creates Drive folder).
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

    // Verify ownership and get plan info
    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        include: {
            cloudAccount: true,
            user: { include: { plan: true } }
        }
    });

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.cloudAccount.provider !== 'google') {
        return NextResponse.json(
            { error: 'Collaborative galleries only work with Google Drive' },
            { status: 400 }
        );
    }

    // Check plan eligibility
    let isEligible = isPlanEligible(project.user.plan?.name);

    // [NEW] Dynamic check from Plan Configuration (Matrix)
    try {
        const planConfig = project.user.plan?.config as any;
        const planLimits = project.user.plan?.limits ? JSON.parse(project.user.plan.limits as string) : null;

        if (planConfig?.features?.collaborativeGalleries === true) {
            isEligible = true;
        } else if (planConfig?.features?.collaborativeGalleries === false) {
            isEligible = false;
        } else if (planLimits?.collaborativeGalleries === true) {
            isEligible = true;
        } else if (planLimits?.collaborativeGalleries === false) {
            isEligible = false;
        }
    } catch (e) {
        console.error("Error parsing plan config for eligibility check", e);
    }

    if (!isEligible) {
        return NextResponse.json(
            { error: 'Collaborative galleries are not enabled for your plan' },
            { status: 403 }
        );
    }

    try {
        const result = await enableCollaborativeGallery(projectId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Enable collaborative gallery error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

/**
 * DELETE /api/projects/[id]/collaborative
 * Disable collaborative gallery (soft delete - just deactivates).
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const collaborativeGallery = await prisma.collaborativeGallery.findFirst({
        where: {
            projectId,
            project: { userId: session.user.id }
        }
    });

    if (!collaborativeGallery) {
        return NextResponse.json({ error: 'Collaborative gallery not found' }, { status: 404 });
    }

    await prisma.collaborativeGallery.update({
        where: { id: collaborativeGallery.id },
        data: { isActive: false }
    });

    return NextResponse.json({ success: true });
}
