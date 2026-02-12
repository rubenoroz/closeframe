"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, MoreVertical, Archive, Trash2, Undo2, FolderOpen, Calendar, Copy, Search, X, Upload } from "lucide-react";
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


export function ProjectList({ canCreate = true }: { canCreate?: boolean }) {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'active' | 'archived'>('active');
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
        setIsDeleteModalOpen(true);
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
        <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
            {/* Header */}
            <div className="h-auto border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center px-6 py-4 gap-4 justify-between shrink-0 bg-white dark:bg-neutral-900">
                <h1 className="font-semibold text-lg flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                    <ScenaIcon className="w-6 h-6 text-emerald-500" />
                    Mis Proyectos
                </h1>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search Bar */}
                    <div className="flex items-center px-3 py-2 rounded-lg border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus-within:border-emerald-500 transition-all flex-1 sm:flex-initial sm:min-w-[250px]">
                        <Search className="w-4 h-4 text-neutral-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar proyecto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-500 text-neutral-900 dark:text-white"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")}>
                                <X className="w-3 h-3 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300" />
                            </button>
                        )}
                    </div>
                    <Button
                        onClick={() => setIsImportModalOpen(true)}
                        variant="outline"
                        className="gap-2 whitespace-nowrap border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Importar CSV</span>
                    </Button>
                    {canCreate ? (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nuevo Proyecto</span>
                        </Button>
                    ) : (
                        <Button
                            disabled
                            className="bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed gap-2 whitespace-nowrap"
                            title="Límite de proyectos alcanzado"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Límite Alcanzado</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {/* Tabs */}
                <div className="flex gap-6 mb-8 border-b border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={() => setView('active')}
                        className={`pb-3 px-1 text-sm font-medium transition-all relative ${view === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                            }`}
                    >
                        Activos
                        {view === 'active' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setView('archived')}
                        className={`pb-3 px-1 text-sm font-medium transition-all relative ${view === 'archived'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                            }`}
                    >
                        Archivados
                        {view === 'archived' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                        ))}
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
                                            {currentUserId === project.ownerId && (
                                                <>
                                                    {view === 'active' ? (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleArchive(project.id, true)}>
                                                                <Archive className="mr-2 h-4 w-4" /> Archivar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(project.id)}
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
                                                                onClick={() => handleDelete(project.id)}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </>
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
                title="Eliminar Proyecto"
                description="¿Estás seguro de eliminar este proyecto permanentemente? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDestructive
            />
        </div>
    );
}
