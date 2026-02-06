import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/scena/KanbanBoard";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShareProjectModal } from "@/components/scena/ShareProjectModal";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/dashboard");
    }

    const project = await prisma.scenaProject.findUnique({
        where: { id: projectId },
        include: { members: true }
    });

    if (!project) {
        notFound();
    }

    const isMember = project.members.some(m => m.userId === session.user.id);
    const isOwner = project.ownerId === session.user.id;

    if (!isOwner && !isMember) {
        redirect("/dashboard/scena");
    }

    // Determine if can share (Owner or Admin member)
    const isAdmin = isOwner || project.members.find(m => m.userId === session.user.id)?.role === "ADMIN";

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="h-[60px] border-b border-neutral-800 flex items-center px-6 justify-between shrink-0 bg-neutral-900">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/scena" className="text-neutral-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-semibold text-lg flex items-center gap-2 text-white">
                        <img src="/scenai-icon.svg" alt="Scena" className="w-6 h-6" />
                        Scena
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-400 font-mono hidden md:inline-block">
                        {project.name}
                    </span>
                    {isAdmin && (
                        <ShareProjectModal projectId={project.id} />
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-hidden p-6 bg-neutral-950">
                <KanbanBoard projectId={project.id} />
            </div>
        </div>
    );
}
