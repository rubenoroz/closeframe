
import { prisma } from "@/lib/db";

export type ProjectAccess = {
    isOwner: boolean;
    isMember: boolean;
    role: "VIEWER" | "EDITOR" | "ADMIN" | null;
    hasAccess: boolean;
};

export async function verifyProjectAccess(projectId: string, userId: string): Promise<ProjectAccess> {
    const project = await prisma.scenaProject.findUnique({
        where: { id: projectId },
        include: { members: true }
    }) as any; // Temporary cast to avoid CI type error if generation lags

    if (!project) {
        return { isOwner: false, isMember: false, role: null, hasAccess: false };
    }

    if (project.ownerId === userId) {
        return { isOwner: true, isMember: false, role: "ADMIN", hasAccess: true };
    }

    const member = project.members.find((m: any) => m.userId === userId);
    if (member) {
        return { isOwner: false, isMember: true, role: member.role as any, hasAccess: true };
    }

    return { isOwner: false, isMember: false, role: null, hasAccess: false };
}
