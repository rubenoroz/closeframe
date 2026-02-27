"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, MoreVertical, Archive, Trash2, Undo2, FolderOpen, Calendar, Copy, Search, X, Upload, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateProjectModal } from "./CreateProjectModal";
import { CsvImportModal } from "./CsvImportModal";
import { ConfirmModal } from "./ConfirmModal";
import { InvitationList } from "./InvitationList";
import { useRouter } from "next/navigation";
import { ScenaIcon } from "@/components/icons/ScenaIcon";

interface Project {
    id: string;
    name: string;
    description: string | null;
    isArchived: boolean;
    ownerId: string;
    booking?: {
        customerName: string;
        date: string;
    } | null;
    updatedAt: string;
}


export function ProjectList({
    canCreate = true,
    initialInvitations = []
}: {
    canCreate?: boolean;
    initialInvitations?: any[];
}) {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [invitations, setInvitations] = useState<any[]>(initialInvitations);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'active' | 'archived' | 'invitations'>('active');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch current user id
        fetch("/api/auth/session")
            .then(res => res.json())
            .then(data => {
                if (data?.user?.id) setCurrentUserId(data.user.id);
            })
            .catch(err => console.error("Error fetching session", err));
    }, []);

    // Filter projects by search term
    const filteredProjects = projects.filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            p.name.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term) ||
            p.booking?.customerName?.toLowerCase().includes(term)
        );
    });

    // Scena Pastel Palette (same as columns)
    const CARD_COLORS = [
        '#FBCFE8', // Pink
        '#C7D2FE', // Indigo
        '#BFDBFE', // Blue
        '#A7F3D0', // Emerald
        '#FEF08A', // Yellow
        '#FED7AA', // Orange
        '#E9D5FF', // Purple
        '#99F6E4', // Teal
        '#D9F99D', // Lime
        '#E2E8F0', // Slate
        '#FECDD3', // Rose
        '#BAE6FD', // Sky
    ];

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/scena/projects?archived=${view === 'archived'}`, {
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [view]);

    const handleArchive = async (projectId: string, archive: boolean) => {
        try {
            const res = await fetch(`/api/scena/projects/${projectId}/archive`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isArchived: archive }),
            });
            if (res.ok) fetchProjects();
        } catch (err) {
            console.error("Error archiving:", err);
        }
    };

    // Confirm Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

    // ... existing filters ...

    // ... (keep filters and fetchProjects) ...

    const handleDelete = (projectId: string) => {
        setProjectToDelete(projectId);
        // Add a 250ms delay so the DropdownMenu can finish its closing
        // animation and focus management before opening the modal.
        setTimeout(() => setIsDeleteModalOpen(true), 250);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;

        try {
            const res = await fetch(`/api/scena/projects/${projectToDelete}`, {
                method: "DELETE",
            });
            if (res.ok) fetchProjects();
        } catch (err) {
            console.error("Error deleting:", err);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh+2rem)] md:h-[calc(100vh+4rem)] lg:h-[calc(100vh+6rem)] bg-[#0E0E0E] text-neutral-200 font-sans -m-4 md:-m-8 lg:-m-12 overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-6 md:px-10 lg:px-12 py-4 border-b border-[#1E1E1E] bg-[#141414] shrink-0">
                <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                    <ScenaIcon className="w-6 h-6 text-emerald-500" />
                    Mis Proyectos
                </h1>
                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar proyecto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64 pl-10 pr-4 py-2 bg-[#1C1C1C] border border-[#2B2B2B] text-sm text-white rounded-lg focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-500"
                        />
                    </div>
                    <Button
                        onClick={() => setIsImportModalOpen(true)}
                        variant="outline"
                        className="gap-2 whitespace-nowrap bg-transparent border-[#2B2B2B] text-neutral-400 hover:text-white hover:bg-[#1C1C1C]"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Importar CSV</span>
                    </Button>
                    {canCreate ? (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-[#059669] hover:bg-[#047857] text-white gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nuevo Proyecto</span>
                        </Button>
                    ) : (
                        <Button
                            disabled
                            className="bg-neutral-800 text-neutral-500 cursor-not-allowed gap-2 whitespace-nowrap"
                            title="Límite de proyectos alcanzado"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Límite Alcanzado</span>
                        </Button>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 md:px-10 lg:px-12 py-8">
                {/* Tabs Area */}
                <div className="flex gap-6 mb-8 border-b border-[#1E1E1E]">
                    <button
                        onClick={() => setView('active')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${view === 'active' ? 'text-emerald-500 border-emerald-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                    >
                        Activos
                    </button>
                    <button
                        onClick={() => setView('archived')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${view === 'archived' ? 'text-emerald-500 border-emerald-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                    >
                        Archivados
                    </button>
                    <button
                        onClick={() => setView('invitations')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${view === 'invitations' ? 'text-emerald-500 border-emerald-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                    >
                        Invitaciones
                        {invitations.length > 0 && (
                            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {invitations.length}
                            </span>
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                        ))}
                    </div>
                ) : view === 'invitations' ? (
                    <div className="max-w-5xl">
                        <InvitationList initialInvitations={invitations} />
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                            <FolderOpen className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                            {searchTerm
                                ? 'No se encontraron proyectos'
                                : view === 'active'
                                    ? 'No hay proyectos activos'
                                    : 'No hay proyectos archivados'}
                        </h3>
                        <p className="text-neutral-500 max-w-sm mb-6">
                            {searchTerm
                                ? `No hay proyectos que coincidan con "${searchTerm}".`
                                : view === 'active'
                                    ? 'Crea tu primer proyecto para comenzar a organizar tus tareas.'
                                    : 'Los proyectos que archives aparecerán aquí.'}
                        </p>
                        {view === 'active' && !searchTerm && (
                            canCreate ? (
                                <Button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    variant="outline"
                                >
                                    Crear proyecto
                                </Button>
                            ) : (
                                <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">
                                    Has alcanzado el límite de proyectos de tu plan.
                                </p>
                            )
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredProjects.map((project, idx) => (
                            <div
                                key={project.id}
                                className="relative group rounded-2xl p-5 border border-neutral-200/50 transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col h-[200px]"
                                style={{
                                    backgroundColor: CARD_COLORS[idx % CARD_COLORS.length]
                                }}
                            >
                                <div onClick={() => router.push(`/dashboard/scena/${project.id}`)} className="cursor-pointer flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-neutral-800 line-clamp-3 pr-8">
                                            {project.name}
                                        </h3>
                                    </div>

                                    <p className="text-neutral-700 text-sm line-clamp-3 mb-3 flex-1 font-medium">
                                        {project.description || "Sin descripción"}
                                    </p>

                                    {project.booking && (
                                        <div className="mt-auto flex items-center gap-2 text-xs font-medium text-neutral-700 bg-white/50 p-2 rounded-lg w-fit backdrop-blur-sm">
                                            <Calendar className="w-3 h-3" />
                                            <span>
                                                {new Date(project.booking.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/50 hover:bg-white rounded-full shadow-sm text-neutral-700 ring-1 ring-black/5">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-lg">
                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/scena/${project.id}`)}>
                                                <FolderOpen className="mr-2 h-4 w-4" /> Abrir
                                            </DropdownMenuItem>

                                            {/* Only Owner can Archive/Delete */}
                                            {currentUserId === project.ownerId ? (
                                                <>
                                                    {view === 'active' ? (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleArchive(project.id, true)}>
                                                                <Archive className="mr-2 h-4 w-4" /> Archivar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onSelect={(e) => {
                                                                    e.preventDefault();
                                                                    handleDelete(project.id);
                                                                }}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                            </DropdownMenuItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleArchive(project.id, false)}>
                                                                <Undo2 className="mr-2 h-4 w-4" /> Desarchivar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onSelect={(e) => {
                                                                    e.preventDefault();
                                                                    handleDelete(project.id);
                                                                }}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <DropdownMenuItem
                                                    onSelect={(e) => {
                                                        e.preventDefault();
                                                        handleDelete(project.id);
                                                    }}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10"
                                                >
                                                    <LogOut className="mr-2 h-4 w-4" /> Salir del proyecto
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <CsvImportModal
                isOpen={isImportModalOpen}
                onClose={() => {
                    setIsImportModalOpen(false);
                    fetchProjects();
                }}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={projects.find(p => p.id === projectToDelete)?.ownerId === currentUserId ? "Eliminar Proyecto" : "Salir del Proyecto"}
                description={projects.find(p => p.id === projectToDelete)?.ownerId === currentUserId
                    ? "¿Estás seguro de eliminar este proyecto permanentemente? Esta acción no se puede deshacer."
                    : "¿Estás seguro de salir de este proyecto? Ya no aparecerá en tu panel, pero seguirá disponible para el dueño y otros miembros."
                }
                confirmText={projects.find(p => p.id === projectToDelete)?.ownerId === currentUserId ? "Eliminar" : "Salir"}
                isDestructive
            />
        </div>
    );
}
