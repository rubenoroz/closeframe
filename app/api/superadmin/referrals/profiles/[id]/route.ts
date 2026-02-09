import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/superadmin/referrals/profiles/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const profile = await prisma.referralProfile.findUnique({
        where: { id },
        include: {
            assignments: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, image: true }
                    }
                },
                take: 10, // Preview of first 10 assignments
                orderBy: { createdAt: "desc" }
            },
            _count: {
                select: { assignments: true }
            }
        }
    });

    if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
}

// PATCH /api/superadmin/referrals/profiles/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { name, isDefault, isActive, config } = body;

        const existingProfile = await prisma.referralProfile.findUnique({
            where: { id }
        });

        if (!existingProfile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // If setting as default, unset other defaults of same type
        if (isDefault && !existingProfile.isDefault) {
            await prisma.referralProfile.updateMany({
                where: {
                    type: existingProfile.type,
                    isDefault: true,
                    id: { not: id }
                },
                data: { isDefault: false }
            });
        }

        const profile = await prisma.referralProfile.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(isDefault !== undefined && { isDefault }),
                ...(isActive !== undefined && { isActive }),
                ...(config !== undefined && { config })
            }
        });

        return NextResponse.json(profile);
    } catch (error) {
        console.error("Error updating referral profile:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}

// DELETE /api/superadmin/referrals/profiles/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Check if profile has active assignments
        const assignmentCount = await prisma.referralAssignment.count({
            where: { profileId: id, status: "ACTIVE" }
        });

        if (assignmentCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete profile with ${assignmentCount} active assignments` },
                { status: 400 }
            );
        }

        await prisma.referralProfile.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting referral profile:", error);
        return NextResponse.json(
            { error: "Failed to delete profile" },
            { status: 500 }
        );
    }
}
