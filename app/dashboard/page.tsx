"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    Folder, MoreVertical, Plus, ExternalLink, Calendar, X,
    Shield, Download, Layout, Save, Loader2, Settings, Trash2,
    Link as LinkIcon, Check, Copy, AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

interface Project {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    passwordProtected: boolean;
    downloadEnabled: boolean;
    downloadJpgEnabled: boolean;
    downloadRawEnabled: boolean;
    downloadVideoHdEnabled?: boolean;
    downloadVideoRawEnabled?: boolean;
    enableVideoTab?: boolean;
    headerTitle?: string;
    headerFontFamily?: string;
    headerColor?: string;
    headerBackground?: string;
    public: boolean;
    layoutType: string;
    cloudAccount: {
        email: string;
        provider: string;
    };
    health?: {
        web: boolean;
        jpg: boolean;
        raw: boolean;
    };
}

export default function DashboardPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [theme, setTheme] = useState<string>("dark");
    const isLight = theme === "light";

    const [editData, setEditData] = useState({
        name: "",
        password: "",
        downloadEnabled: true,
        downloadJpgEnabled: true,
        downloadRawEnabled: false,
        downloadVideoHdEnabled: true,
        downloadVideoRawEnabled: false,
        headerTitle: "",
        headerFontFamily: "Inter",
        headerColor: "#FFFFFF",
        headerBackground: "dark",
        public: true,
    });

    const fetchData = () => {
        setLoading(true);
        // Fetch projects
        const projectsPromise = fetch("/api/projects").then(res => res.json());
        // Fetch user settings (for ID)
        const settingsPromise = fetch("/api/user/settings").then(res => res.json());

        Promise.all([projectsPromise, settingsPromise])
            .then(([projectsData, settingsData]) => {
                if (projectsData.projects) setProjects(projectsData.projects);
                if (settingsData.user) {
                    setUserId(settingsData.user.id);
                    setTheme(settingsData.user.theme || "dark");
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    const openSettings = (project: Project) => {
        setSelectedProject(project);
        setEditData({
            name: project.name,
            password: "",
            downloadEnabled: project.downloadEnabled,
            downloadJpgEnabled: project.downloadJpgEnabled !== false,
            downloadRawEnabled: project.downloadRawEnabled === true,
            downloadVideoHdEnabled: project.downloadVideoHdEnabled !== false,
            downloadVideoRawEnabled: project.downloadVideoRawEnabled === true,
            headerTitle: project.headerTitle || project.name,
            headerFontFamily: project.headerFontFamily || "Inter",
            headerColor: project.headerColor || "#FFFFFF",
            headerBackground: project.headerBackground || "dark",
            public: project.public !== false,
        });
        setActiveMenu(null);
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/projects", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedProject.id,
                    name: editData.name,
                    password: editData.password,
                    downloadEnabled: editData.downloadEnabled,
                    downloadJpgEnabled: editData.downloadJpgEnabled,
                    downloadRawEnabled: editData.downloadRawEnabled,
                    downloadVideoHdEnabled: editData.downloadVideoHdEnabled,
                    downloadVideoRawEnabled: editData.downloadVideoRawEnabled,
                    headerTitle: editData.headerTitle,
                    headerFontFamily: editData.headerFontFamily,
                    headerColor: editData.headerColor,
                    headerBackground: editData.headerBackground,
                    public: editData.public,
                })
            });

            if (res.ok) {
                setSelectedProject(null);
                fetchData();
            } else {
                const errorData = await res.json();
                console.error("Server error:", errorData);
                alert("Error al guardar cambios: " + (errorData.error || "Error desconocido"));
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Error de conexión al guardar cambios");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProject = async (id: string) => {
        try {
            const res = await fetch(`/api/projects?id=${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setDeleteConfirm(null);
                fetchData();
            } else {
                alert("No se pudo eliminar la galería");
            }
        } catch (error) {
            console.error(error);
            alert("Error al eliminar");
        }
    };

    const copyPublicLink = (slug: string, id: string) => {
        const url = `${window.location.origin}/g/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        setActiveMenu(null);
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center justify-between mb-10">
                    <div>
                        <Skeleton className="h-9 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-36 rounded-full" />
                </header>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 min-h-[200px] flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <Skeleton className="w-12 h-12 rounded-lg" />
                                <Skeleton className="w-5 h-5 rounded-full" />
                            </div>
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2 mb-6" />
                            <div className="flex items-center justify-between border-t border-neutral-800 pt-4 mt-auto">
                                <Skeleton className="h-3 w-20" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-7 w-12 rounded-full" />
                                    <Skeleton className="h-7 w-16 rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-700 pb-20 selection:bg-emerald-500/30 -mx-6 -mt-10 px-6 pt-10 ${isLight ? 'bg-neutral-50 text-neutral-900' : 'bg-black text-white'
            }`}>
            {/* Subtle background patterns */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-light mb-1">Mis Galerías</h1>
                        <p className="text-neutral-500 text-sm">Gestiona y comparte tus proyectos fotográficos.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {userId && (
                            <Link
                                href={`/p/${userId}`}
                                target="_blank"
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition border shadow-sm ${isLight
                                    ? "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                    : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                                    }`}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Ver Perfil Público
                            </Link>
                        )}
                        <Link
                            href="/dashboard/new"
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-medium hover:opacity-90 transition"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Galería
                        </Link>
                    </div>
                </header>

                {projects.length === 0 ? (
                    <div className="border border-dashed border-neutral-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center bg-neutral-900/20 hover:bg-neutral-900/40 transition group">
                        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition">
                            <Folder className="w-6 h-6 text-neutral-400" />
                        </div>
                        <h3 className="text-xl font-medium mb-2">No tienes galerías aún</h3>
                        <p className="text-neutral-500 mb-6 max-w-sm">Conecta una carpeta de fotos para crear tu primera galería profesional.</p>
                        <Link
                            href="/dashboard/new"
                            className="text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                            Crear mi primera galería &rarr;
                        </Link>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <div key={project.id} className={`group border rounded-2xl p-5 transition-all duration-300 flex flex-col min-h-[220px] relative ${isLight ? "bg-white border-neutral-100 hover:border-emerald-500 hover:shadow-xl hover:shadow-neutral-200/50" : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                                }`}>
                                {project.passwordProtected ? (
                                    <div className="absolute top-0 right-0 p-1.5 bg-emerald-600 text-white rounded-bl-lg shadow-lg z-10 flex items-center gap-1 px-2.5">
                                        <Shield className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Protegida</span>
                                    </div>
                                ) : project.public ? (
                                    <div className="absolute top-0 right-0 p-1.5 bg-blue-500 text-white rounded-bl-lg shadow-lg z-10 flex items-center gap-1 px-2.5">
                                        <ExternalLink className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Pública</span>
                                    </div>
                                ) : (
                                    <div className="absolute top-0 right-0 p-1.5 bg-neutral-500 text-white rounded-bl-lg shadow-lg z-10 flex items-center gap-1 px-2.5 opacity-50">
                                        <Shield className="w-3 h-3 grayscale" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Privada</span>
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <Link
                                        href={`/g/${project.slug}`}
                                        target="_blank"
                                        className={`${isLight ? 'bg-neutral-100' : 'bg-neutral-800'} p-3 rounded-lg hover:bg-emerald-500 hover:text-white transition group/folder`}
                                    >
                                        <Folder className={`w-6 h-6 ${isLight ? 'text-neutral-400' : 'text-neutral-300'} group-hover/folder:text-white`} />
                                    </Link>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => copyPublicLink(project.slug, project.id)}
                                            className={`p-2.5 rounded-full transition relative ${copiedId === project.id
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                : isLight ? 'bg-neutral-50 text-neutral-400 hover:bg-emerald-500 hover:text-white' : 'bg-white/5 text-neutral-400 hover:text-white'
                                                }`}
                                            title="Copiar enlace público"
                                        >
                                            {copiedId === project.id ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === project.id ? null : project.id);
                                                }}
                                                className="p-2 rounded-full hover:bg-white/5 text-neutral-500 hover:text-white transition"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {activeMenu === project.id && (
                                                <div
                                                    className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-2xl z-[100] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isLight ? "bg-white border-neutral-200 shadow-neutral-200" : "bg-neutral-900 border-neutral-800 shadow-black"
                                                        }`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className={`px-4 py-2 text-[10px] uppercase tracking-widest border-b mb-1 opacity-50 ${isLight ? 'border-neutral-100' : 'border-white/5'}`}>
                                                        Gestión
                                                    </div>
                                                    <button
                                                        onClick={() => openSettings(project)}
                                                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition ${isLight ? "text-neutral-700 hover:bg-neutral-50" : "text-neutral-300 hover:bg-white/5"
                                                            }`}
                                                    >
                                                        <Settings className="w-4 h-4" /> Ajustes de Galería
                                                    </button>
                                                    <button
                                                        onClick={() => copyPublicLink(project.slug, project.id)}
                                                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition ${isLight ? "text-neutral-700 hover:bg-neutral-50" : "text-neutral-300 hover:bg-white/5"
                                                            }`}
                                                    >
                                                        <Copy className="w-4 h-4" /> Copiar Link Público
                                                    </button>
                                                    <a
                                                        href={`/g/${project.slug}`}
                                                        target="_blank"
                                                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition ${isLight ? "text-neutral-700 hover:bg-neutral-50" : "text-neutral-300 hover:bg-white/5"
                                                            }`}
                                                    >
                                                        <ExternalLink className="w-4 h-4" /> Abrir Galería
                                                    </a>
                                                    <div className={`h-px my-1 ${isLight ? 'bg-neutral-100' : 'bg-neutral-800'}`}></div>
                                                    <button
                                                        onClick={() => {
                                                            setDeleteConfirm(project.id);
                                                            setActiveMenu(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition font-medium"
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Eliminar Galería
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium group-hover:text-emerald-400 transition truncate pr-2">
                                        {project.name}
                                    </h3>
                                    <p className="text-xs text-neutral-500 mb-6 flex items-center gap-2">
                                        Enlazado a: <span className="text-neutral-400 truncate w-full">{project.cloudAccount.email}</span>
                                    </p>
                                </div>

                                {/* Health Indicators Section */}
                                <div className="mt-auto space-y-3">
                                    {!project.health?.web && (
                                        <div className="flex items-center gap-2 text-[10px] text-orange-400 bg-orange-400/5 px-2 py-1 rounded-md border border-orange-400/20">
                                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                            <span>Falta carpeta <b>webjpg</b>: La galería podría cargar lento.</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 py-3 border-t border-white/5">
                                        <div className="flex gap-1.5">
                                            <div className="flex flex-col gap-0.5">
                                                <span
                                                    className={`px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase border transition-colors text-center ${project.health?.web
                                                        ? isLight ? "bg-blue-600 text-white border-blue-700" : "bg-blue-500 text-white border-blue-600"
                                                        : isLight ? "bg-neutral-100 text-neutral-400 border-neutral-200" : "bg-neutral-800 text-neutral-600 border-transparent opacity-40"
                                                        }`}
                                                >
                                                    WEB
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span
                                                    className={`px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase border transition-colors text-center ${project.health?.jpg
                                                        ? isLight ? "bg-emerald-600 text-white border-emerald-700" : "bg-emerald-500 text-white border-emerald-600"
                                                        : isLight ? "bg-neutral-100 text-neutral-400 border-neutral-200" : "bg-neutral-800 text-neutral-600 border-transparent opacity-40"
                                                        }`}
                                                >
                                                    JPG
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span
                                                    className={`px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase border transition-colors text-center ${project.health?.raw
                                                        ? isLight ? "bg-orange-600 text-white border-orange-700" : "bg-orange-500 text-white border-orange-600"
                                                        : isLight ? "bg-neutral-100 text-neutral-400 border-neutral-200" : "bg-neutral-800 text-neutral-600 border-transparent opacity-40"
                                                        }`}
                                                >
                                                    RAW
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`ml-auto flex items-center gap-2 text-[10px] font-medium ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                            <Calendar className="w-3 h-3" />
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-medium mb-4">¿Eliminar Galería?</h2>
                            <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
                                Esta acción no se puede deshacer. Se eliminará el acceso público a esta galería, pero los archivos en Google Drive no se tocarán.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-3 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDeleteProject(deleteConfirm)}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition text-sm"
                                >
                                    Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Modal */}
                {selectedProject && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
                        <div className={`${isLight ? 'bg-white text-neutral-900 border-neutral-200' : 'bg-neutral-900 text-white border-neutral-800'} border rounded-[3rem] w-full max-w-lg p-10 relative shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto`}>
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="absolute top-8 right-8 text-neutral-500 hover:text-emerald-500 transition"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h2 className="text-3xl font-light mb-10 flex items-center gap-4">
                                <Settings className="w-8 h-8 text-emerald-500" />
                                Ajustes
                            </h2>

                            <form onSubmit={handleUpdateProject} className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest mb-3 block opacity-40">Nombre de Galería</label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        className={`w-full border rounded-2xl px-6 py-4 outline-none transition-all ${isLight ? 'bg-neutral-50 border-neutral-100 focus:border-emerald-500' : 'bg-neutral-800 border-neutral-700 focus:border-emerald-500'
                                            }`}
                                        required
                                    />
                                </div>

                                {/* Header Customization Section */}
                                <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Layout className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm font-medium">Personalización del Header</span>
                                    </div>

                                    <div className="space-y-4 pl-7">
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Título del Header</label>
                                            <input
                                                type="text"
                                                value={editData.headerTitle}
                                                onChange={(e) => setEditData({ ...editData, headerTitle: e.target.value })}
                                                placeholder="Ej: Boda de Ana & Carlos"
                                                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${isLight ? 'bg-white border-neutral-200 focus:border-emerald-500' : 'bg-neutral-900 border-neutral-700 focus:border-emerald-500'}`}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Tipografía</label>
                                                <select
                                                    value={editData.headerFontFamily}
                                                    onChange={(e) => setEditData({ ...editData, headerFontFamily: e.target.value })}
                                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${isLight ? 'bg-white border-neutral-200 focus:border-emerald-500' : 'bg-neutral-900 border-neutral-700 focus:border-emerald-500'}`}
                                                >
                                                    <option value="Inter">Inter</option>
                                                    <option value="Playfair Display">Playfair Display</option>
                                                    <option value="Montserrat">Montserrat</option>
                                                    <option value="Lora">Lora</option>
                                                    <option value="Cormorant Garamond">Cormorant Garamond</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Color del Texto</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={editData.headerColor}
                                                        onChange={(e) => setEditData({ ...editData, headerColor: e.target.value })}
                                                        className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editData.headerColor}
                                                        onChange={(e) => setEditData({ ...editData, headerColor: e.target.value })}
                                                        className={`flex-1 border rounded-xl px-3 py-2 text-sm font-mono outline-none transition-all ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-700'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 block">Tema de Fondo</label>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditData({ ...editData, headerBackground: "dark" })}
                                                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${editData.headerBackground === "dark"
                                                        ? "bg-neutral-900 text-white border-2 border-emerald-500"
                                                        : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600"
                                                        }`}
                                                >
                                                    🌙 Oscuro
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditData({ ...editData, headerBackground: "light" })}
                                                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${editData.headerBackground === "light"
                                                        ? "bg-white text-black border-2 border-emerald-500"
                                                        : "bg-neutral-100 text-neutral-600 border border-neutral-200 hover:border-neutral-300"
                                                        }`}
                                                >
                                                    ☀️ Claro
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                    <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border md:col-span-2`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Download className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium">Permisos de Descarga</span>
                                        </div>

                                        <div className="space-y-3 pl-7">
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className={`text-sm ${editData.downloadEnabled ? (isLight ? 'text-neutral-900' : 'text-white') : 'text-neutral-500'}`}>Activar Descargas</span>
                                                <input
                                                    type="checkbox"
                                                    checked={editData.downloadEnabled}
                                                    onChange={(e) => setEditData({ ...editData, downloadEnabled: e.target.checked })}
                                                    className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                />
                                            </label>

                                            {editData.downloadEnabled && (
                                                <div className={`animate-in slide-in-from-top-2 fade-in duration-300 space-y-3 pt-2 border-t border-dashed ${isLight ? 'border-neutral-200' : 'border-neutral-700/50'}`}>
                                                    <label className="flex items-center justify-between cursor-pointer group">
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>Alta Resolución (JPG)</span>
                                                            <span className="text-[9px] text-neutral-500">Para clientes finales</span>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={editData.downloadJpgEnabled}
                                                            onChange={(e) => setEditData({ ...editData, downloadJpgEnabled: e.target.checked })}
                                                            className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                        />
                                                    </label>
                                                    <label className="flex items-center justify-between cursor-pointer group">
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>Originales (RAW)</span>
                                                            <span className="text-[9px] text-neutral-500">Archivos crudos de cámara</span>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={editData.downloadRawEnabled}
                                                            onChange={(e) => setEditData({ ...editData, downloadRawEnabled: e.target.checked })}
                                                            className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                        />
                                                    </label>

                                                    {/* Video Download Options */}
                                                    <div className={`mt-4 pt-4 border-t ${isLight ? 'border-neutral-200' : 'border-neutral-700/50'}`}>
                                                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Videos</span>
                                                        <div className="space-y-3">
                                                            <label className="flex items-center justify-between cursor-pointer group">
                                                                <div className="flex flex-col">
                                                                    <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>HD (1080p)</span>
                                                                    <span className="text-[9px] text-neutral-500">Videos en alta definición</span>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editData.downloadVideoHdEnabled}
                                                                    onChange={(e) => setEditData({ ...editData, downloadVideoHdEnabled: e.target.checked })}
                                                                    className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                                />
                                                            </label>
                                                            <label className="flex items-center justify-between cursor-pointer group">
                                                                <div className="flex flex-col">
                                                                    <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>Alta Calidad (4K/ProRes)</span>
                                                                    <span className="text-[9px] text-neutral-500">Videos en máxima calidad</span>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editData.downloadVideoRawEnabled}
                                                                    onChange={(e) => setEditData({ ...editData, downloadVideoRawEnabled: e.target.checked })}
                                                                    className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <ExternalLink className="w-4 h-4 text-neutral-400" />
                                                <span className="text-sm">Perfil Público</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={editData.public}
                                                onChange={(e) => {
                                                    const isPublic = e.target.checked;
                                                    setEditData({
                                                        ...editData,
                                                        public: isPublic,
                                                        password: isPublic ? "" : editData.password
                                                    });
                                                }}
                                                className="w-5 h-5 accent-emerald-500"
                                            />
                                        </label>
                                        <p className="text-[10px] text-neutral-500 mt-2 ml-7">Muestra esta galería en tu portafolio.</p>
                                    </div>

                                    <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Layout className="w-4 h-4 text-neutral-400" />
                                            <span className="text-sm">Diseño Grid</span>
                                        </div>
                                        <p className="text-[10px] text-neutral-500 ml-7">Masonry (Predeterminado)</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-neutral-500 uppercase tracking-widest mb-2 block">Protección por Contraseña</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                        <input
                                            type="text"
                                            placeholder={selectedProject.passwordProtected ? "•••••••• (Contraseña activa)" : "Introduce una contraseña para bloquear"}
                                            value={editData.password}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditData({
                                                    ...editData,
                                                    password: val,
                                                    public: val.trim() !== "" ? false : editData.public
                                                });
                                            }}
                                            className={`w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition placeholder:text-neutral-600 ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-800 border-neutral-700 text-white'}`}
                                        />
                                    </div>
                                    <p className="text-[10px] text-neutral-500 mt-2">Deja en blanco para no cambiar. Introduce un espacio y borra si quieres quitarla.</p>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProject(null)}
                                        className={`flex-1 py-3 rounded-xl border transition ${isLight ? 'border-neutral-200 text-neutral-500 hover:bg-neutral-50' : 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
