"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Folder, MoreVertical, Plus, ExternalLink, Calendar, X,
    Shield, Download, Layout, Save, Loader2, Settings, Trash2,
    Link as LinkIcon, Check, Copy, AlertCircle, Image as ImageIcon, Sparkles
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import DriveFilePicker from "@/components/DriveFilePicker";
import ZipFilePicker from "@/components/ZipFilePicker";
import FocalPointPicker from "@/components/FocalPointPicker";
import MusicPicker from "@/components/MusicPicker";

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
    enableWatermark?: boolean;
    category?: string;
    headerTitle?: string;
    headerFontFamily?: string;
    headerFontSize?: number;
    headerColor?: string;
    headerBackground?: string;
    headerImage?: string;
    headerImageFocus?: string;
    public: boolean;
    layoutType: string;
    coverImage?: string;
    coverImageFocus?: string;
    rootFolderId: string;
    cloudAccountId: string;
    cloudAccount: {
        email: string;
        provider: string;
    };
    health?: {
        web: boolean;
        jpg: boolean;
        raw: boolean;
    };
    zipFileId?: string;
    zipFileName?: string;
    isCloserGallery?: boolean;
    musicTrackId?: string;
    musicEnabled?: boolean;
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
    const [profileViews, setProfileViews] = useState<number>(0);
    const [username, setUsername] = useState<string | null>(null);
    const [planLimits, setPlanLimits] = useState<{
        videoEnabled?: boolean;
        lowResDownloads?: boolean;
        passwordProtection?: boolean;
        galleryCover?: boolean;
        closerGalleries?: boolean; // [NEW] Feature flag
    } | null>(null);
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [showHeaderImagePicker, setShowHeaderImagePicker] = useState(false);
    const [showZipFilePicker, setShowZipFilePicker] = useState(false);
    const isLight = theme === "light";
    const router = useRouter();

    const [editData, setEditData] = useState({
        name: "",
        coverImage: "",
        password: "",
        downloadEnabled: true,
        downloadJpgEnabled: true,
        downloadRawEnabled: false,
        downloadVideoHdEnabled: true,
        downloadVideoRawEnabled: false,
        enableVideoTab: false,
        enableWatermark: false,
        category: "",
        headerTitle: "",
        headerFontFamily: "Inter",
        headerFontSize: 100,
        headerColor: "#FFFFFF",
        headerBackground: "dark",
        headerImage: "",
        headerImageFocus: "50,50",
        coverImageFocus: "50,50",
        zipFileId: "",
        zipFileName: "",
        public: true,
        isCloserGallery: false,
        musicTrackId: "",
        musicEnabled: false,    // [NEW]
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
                    setProfileViews(settingsData.user.profileViews || 0);
                    setUsername(settingsData.user.username || null);
                    // Use Effective Config from Server (Modular System)
                    if (settingsData.effectiveConfig?.features) {
                        const features = settingsData.effectiveConfig.features;
                        setPlanLimits({
                            // New names OR legacy names from DB
                            videoEnabled: features.videoGallery ?? features.videoEnabled ?? false,
                            lowResDownloads: features.lowResDownloads ?? false,
                            passwordProtection: features.passwordProtection ?? true,
                            galleryCover: features.galleryCover ?? features.coverImage ?? false,
                            closerGalleries: features.closerGalleries ?? features.zipDownloadsEnabled === true // Proxy for Studio
                        });
                    } else if (settingsData.user.plan?.limits) {
                        try {
                            const limits = typeof settingsData.user.plan.limits === 'string'
                                ? JSON.parse(settingsData.user.plan.limits)
                                : settingsData.user.plan.limits;
                            // Map legacy field names from DB to what dashboard expects
                            setPlanLimits({
                                videoEnabled: limits.videoEnabled ?? false,
                                lowResDownloads: limits.lowResDownloads ?? false,
                                passwordProtection: limits.passwordProtection ?? true,
                                galleryCover: limits.coverImage ?? limits.galleryCover ?? false,
                                closerGalleries: limits.closerGalleries ?? limits.zipDownloadsEnabled === true
                            });
                        } catch { }
                    }
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

    // Handle ESC key for Modals
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (deleteConfirm) setDeleteConfirm(null);
                if (selectedProject) setSelectedProject(null);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [deleteConfirm, selectedProject]);

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
            enableVideoTab: project.enableVideoTab === true,
            enableWatermark: project.enableWatermark === true,
            category: project.category || "",
            headerTitle: project.headerTitle || project.name,
            headerFontFamily: project.headerFontFamily || "Inter",
            headerFontSize: project.headerFontSize || 100,
            headerColor: project.headerColor || "#FFFFFF",
            headerBackground: project.headerBackground || "dark",
            headerImage: project.headerImage || "",
            headerImageFocus: project.headerImageFocus || "50,50",
            coverImage: project.coverImage || "",
            coverImageFocus: project.coverImageFocus || "50,50",
            zipFileId: project.zipFileId || "",
            zipFileName: project.zipFileName || "",
            public: project.public !== false,
            isCloserGallery: project.isCloserGallery || false,
            musicTrackId: project.musicTrackId || "",
            musicEnabled: project.musicEnabled || false, // [NEW]
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
                    enableVideoTab: editData.enableVideoTab,
                    enableWatermark: editData.enableWatermark,
                    category: planLimits?.lowResDownloads ? "personal" : editData.category,
                    headerTitle: editData.headerTitle,
                    headerFontFamily: planLimits?.lowResDownloads ? "Inter" : editData.headerFontFamily,
                    headerFontSize: editData.headerFontSize,
                    headerColor: editData.headerColor,
                    headerBackground: editData.headerBackground,
                    headerImage: editData.headerImage,
                    headerImageFocus: editData.headerImageFocus,
                    coverImage: editData.coverImage,
                    coverImageFocus: editData.coverImageFocus,
                    zipFileId: editData.zipFileId,
                    zipFileName: editData.zipFileName,
                    public: editData.public,
                    isCloserGallery: editData.isCloserGallery,
                    musicTrackId: editData.musicTrackId,
                    musicEnabled: editData.musicEnabled, // [NEW] Autoplay
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

    const handleSaveAndOrganize = async () => {
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
                    enableVideoTab: editData.enableVideoTab,
                    enableWatermark: editData.enableWatermark,
                    category: planLimits?.lowResDownloads ? "personal" : editData.category,
                    headerTitle: editData.headerTitle,
                    headerFontFamily: planLimits?.lowResDownloads ? "Inter" : editData.headerFontFamily,
                    headerFontSize: editData.headerFontSize,
                    headerColor: editData.headerColor,
                    headerBackground: editData.headerBackground,
                    headerImage: editData.headerImage,
                    headerImageFocus: editData.headerImageFocus,
                    coverImage: editData.coverImage,
                    coverImageFocus: editData.coverImageFocus,
                    zipFileId: editData.zipFileId,
                    zipFileName: editData.zipFileName,
                    public: editData.public,
                    isCloserGallery: editData.isCloserGallery,
                    musicTrackId: editData.musicTrackId,
                    musicEnabled: editData.musicEnabled,
                })
            });

            if (res.ok) {
                router.push(`/dashboard/organize/${selectedProject.id}`);
            } else {
                const errorData = await res.json();
                alert("Error al guardar antes de organizar: " + (errorData.error || "Error desconocido"));
            }
        } catch (error) {
            console.error("Save & Organize error:", error);
            alert("Error de conexión al intentar guardar");
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
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-light mb-1">Mis Galerías</h1>
                        <p className="text-neutral-500 text-xs md:text-sm">Gestiona y comparte tus proyectos fotográficos.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        {userId && (
                            <Link
                                href={`/p/${userId}`}
                                target="_blank"
                                className={`flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-full font-medium transition border shadow-sm text-sm ${isLight
                                    ? "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                    : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                                    }`}
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span className="sm:inline">Ver Perfil Público</span>
                            </Link>
                        )}
                        <Link
                            href="/dashboard/new"
                            className="flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-white text-black rounded-full font-medium hover:opacity-90 transition text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Galería
                        </Link>
                    </div>
                </header>

                {/* STATS WIDGET */}
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 ${isLight ? '' : ''}`}>
                    <div className={`p-4 rounded-2xl border ${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/50 border-neutral-800'}`}>
                        <div className={`text-2xl md:text-3xl font-light ${isLight ? 'text-neutral-900' : 'text-white'}`}>{projects.length}</div>
                        <div className={`text-[10px] md:text-xs uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>Galerías</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/50 border-neutral-800'}`}>
                        <div className={`text-2xl md:text-3xl font-light ${isLight ? 'text-neutral-900' : 'text-white'}`}>{profileViews}</div>
                        <div className={`text-[10px] md:text-xs uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>Vistas al perfil</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/50 border-neutral-800'}`}>
                        <div className={`text-2xl md:text-3xl font-light ${isLight ? 'text-neutral-900' : 'text-white'}`}>{projects.filter(p => p.public).length}</div>
                        <div className={`text-[10px] md:text-xs uppercase tracking-wider ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>Públicas</div>
                    </div>
                    {username ? (
                        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-900/20 border-emerald-800'}`}>
                            <div className={`text-sm md:text-base font-mono truncate ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>/u/{username}</div>
                            <div className={`text-[10px] md:text-xs uppercase tracking-wider ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`}>Tu URL</div>
                        </div>
                    ) : (
                        <Link href="/dashboard/settings" className={`p-4 rounded-2xl border hover:border-emerald-500/50 transition ${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/50 border-neutral-800'}`}>
                            <div className={`text-sm ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>Sin configurar</div>
                            <div className={`text-[10px] md:text-xs uppercase tracking-wider ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`}>Crear URL →</div>
                        </Link>
                    )}
                </div>

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



                                {/* Header with Preview */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={`/g/${project.slug}`}
                                            target="_blank"
                                            className={`relative overflow-hidden rounded-lg hover:ring-2 hover:ring-emerald-500 transition group/folder ${project.coverImage
                                                ? 'w-16 h-16'
                                                : `${isLight ? 'bg-neutral-100' : 'bg-neutral-800'} p-3`
                                                }`}
                                        >
                                            {project.coverImage ? (
                                                <img
                                                    src={`/api/cloud/thumbnail?c=${project.cloudAccountId}&f=${project.coverImage}&s=200`}
                                                    alt={project.name}
                                                    className="w-full h-full object-cover rounded-lg group-hover/folder:scale-110 transition-transform duration-300"
                                                />
                                            ) : (
                                                <Folder className={`w-6 h-6 ${isLight ? 'text-neutral-400' : 'text-neutral-300'} group-hover/folder:text-emerald-500`} />
                                            )}
                                        </Link>

                                        {(project as any).isCloserGallery && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800/50 border border-neutral-700/50 rounded-lg backdrop-blur-sm">
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="text-[10px] font-bold text-emerald-400 monitoring-tighter">[CLOSER]</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 mt-8">
                                        {/* Visit gallery button */}
                                        <Link
                                            href={`/g/${project.slug}`}
                                            target="_blank"
                                            className={`p-2.5 rounded-full transition ${isLight ? 'bg-neutral-50 text-neutral-400 hover:bg-emerald-500 hover:text-white' : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'}`}
                                            title="Visitar galería"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>

                                        {/* Copy link button */}
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
                                                    <button
                                                        onClick={() => router.push(`/dashboard/organize/${project.id}`)}
                                                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition ${isLight ? "text-neutral-700 hover:bg-neutral-50" : "text-neutral-300 hover:bg-white/5"
                                                            }`}
                                                    >
                                                        <Layout className="w-4 h-4" /> Organizar Fotos y Videos
                                                    </button>
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
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-pointer"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <div
                            className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
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
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center z-[110] p-0 md:p-4 cursor-pointer"
                        onClick={() => setSelectedProject(null)}
                    >
                        <div
                            className={`${isLight ? 'bg-white text-neutral-900 border-neutral-200' : 'bg-neutral-900 text-white border-neutral-800'} border rounded-t-3xl md:rounded-[2rem] w-full max-w-lg md:max-w-3xl p-6 md:p-8 relative shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[95vh] md:max-h-[90vh] overflow-y-auto cursor-default`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="absolute top-4 right-4 md:top-8 md:right-8 text-neutral-500 hover:text-emerald-500 transition"
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>

                            <h2 className="text-2xl md:text-3xl font-light mb-6 md:mb-10 flex items-center gap-3 md:gap-4">
                                <Settings className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
                                Ajustes
                            </h2>

                            <form onSubmit={handleUpdateProject} className="space-y-8">

                                {/* A - CLOSER GALLERY PREMIUM SECTION */}
                                {true && (
                                    <div className={`p-5 rounded-2xl border-2 transition-all ${editData.isCloserGallery
                                        ? "bg-neutral-900 border-emerald-500 shadow-xl shadow-emerald-900/10"
                                        : isLight ? "bg-neutral-50 border-neutral-100" : "bg-neutral-800/20 border-neutral-800"
                                        }`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editData.isCloserGallery ? "bg-emerald-500 text-white" : "bg-neutral-700 text-neutral-400"
                                                    }`}>
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className={`font-medium ${editData.isCloserGallery ? (isLight ? "text-neutral-900" : "text-white") : "text-neutral-500"}`}>
                                                        Experiencia Closer
                                                    </h3>
                                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Premium Gallery</p>
                                                </div>
                                            </div>

                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editData.isCloserGallery}
                                                    onChange={(e) => setEditData({ ...editData, isCloserGallery: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </label>
                                        </div>

                                        {editData.isCloserGallery && (
                                            <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                                                {/* Music Picker */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Música de Fondo</label>
                                                    <MusicPicker
                                                        selectedTrackId={editData.musicTrackId || null}
                                                        onSelect={(id) => setEditData({ ...editData, musicTrackId: id })}
                                                    />
                                                </div>

                                                {/* Autoplay Toggle */}
                                                <div className="flex items-center gap-3 pl-1">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={editData.musicEnabled}
                                                            onChange={(e) => setEditData({ ...editData, musicEnabled: e.target.checked })}
                                                        />
                                                        <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                                    </label>
                                                    <span className="text-xs text-neutral-400 font-medium">Reproducción automática (Autoplay)</span>
                                                </div>

                                                {/* Moments & File Organization CTA */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Gestión de Contenido</label>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveAndOrganize}
                                                        className={`w-full p-4 rounded-xl border border-neutral-800 bg-neutral-800/20 hover:bg-neutral-800/40 hover:border-emerald-500/50 transition-all flex items-center justify-between group`}
                                                        disabled={isSaving}
                                                    >
                                                        <div className="flex items-center gap-3 text-left">
                                                            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition">
                                                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layout className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">Personalizar Orden y Momentos</p>
                                                                <p className="text-[10px] text-neutral-500">{isSaving ? 'Guardando ajustes...' : 'Reorganiza fotos, videos y carpetas a tu gusto.'}</p>
                                                            </div>
                                                        </div>
                                                        {!isSaving && <Plus className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400" />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!editData.isCloserGallery && (
                                            <p className="text-xs text-neutral-500 mt-2 pl-14">
                                                Activa para habilitar navegación por momentos, música y diseño inmersivo.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 opacity-100">
                                            Categoría
                                            {planLimits?.lowResDownloads && (
                                                <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded opacity-100">Plan Free</span>
                                            )}
                                        </label>
                                        <select
                                            value={planLimits?.lowResDownloads ? "personal" : editData.category || ""}
                                            disabled={!!planLimits?.lowResDownloads}
                                            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                            className={`w-full border rounded-2xl px-6 py-4 outline-none transition-all ${isLight ? 'bg-neutral-50 border-neutral-100 focus:border-emerald-500' : 'bg-neutral-800 border-neutral-700 focus:border-emerald-500'} ${planLimits?.lowResDownloads ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <option value="">Sin categoría</option>
                                            <option value="editorial">📸 Editorial</option>
                                            <option value="commercial">🛍️ Comercial</option>
                                            <option value="wedding">💒 Bodas</option>
                                            <option value="portrait">👤 Retrato</option>
                                            <option value="fashion">👗 Moda</option>
                                            <option value="test">🎭 Test / TFP</option>
                                            <option value="personal">✨ Personal</option>
                                        </select>
                                        {planLimits?.lowResDownloads && (
                                            <p className="text-[10px] text-neutral-500 mt-2">En el plan Personal la categoría es fija.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Header Customization Section */}
                                <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Layout className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm font-medium">Personalización del Header</span>
                                    </div>

                                    <div className="space-y-4 pl-0 md:pl-7">
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    Tipografía
                                                    {planLimits?.lowResDownloads && (
                                                        <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Plan Free</span>
                                                    )}
                                                </label>
                                                <select
                                                    value={planLimits?.lowResDownloads ? "Inter" : editData.headerFontFamily}
                                                    disabled={!!planLimits?.lowResDownloads}
                                                    onChange={(e) => setEditData({ ...editData, headerFontFamily: e.target.value })}
                                                    className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${isLight ? 'bg-white border-neutral-200 focus:border-emerald-500' : 'bg-neutral-900 border-neutral-700 focus:border-emerald-500'} ${planLimits?.lowResDownloads ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <option value="Inter">Inter (Profesional)</option>
                                                    <option value="DM Sans">DM Sans (Moderno)</option>
                                                    <option value="Fraunces">Fraunces (Editorial)</option>
                                                    <option value="Playfair Display">Playfair (Bodas)</option>
                                                    <option value="Cormorant">Cormorant (Artístico)</option>
                                                    <option value="Allura">Allura (Romance)</option>
                                                </select>
                                                {planLimits?.lowResDownloads && (
                                                    <p className="text-[9px] text-neutral-500 mt-1">Solo 'Inter' disponible. Actualiza plan para más fuentes.</p>
                                                )}
                                            </div>

                                            {/* Font Size Slider */}
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                    <span>Tamaño del Texto</span>
                                                    <span className="text-neutral-400">{editData.headerFontSize}%</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="100"
                                                    max="500"
                                                    value={editData.headerFontSize}
                                                    onChange={(e) => setEditData({ ...editData, headerFontSize: parseInt(e.target.value) })}
                                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isLight ? 'bg-neutral-200 accent-neutral-900' : 'bg-neutral-700 accent-white'}`}
                                                />
                                                <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                                                    <span>Normal</span>
                                                    <span>Gigante</span>
                                                </div>
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
                                    </div>

                                    {planLimits?.galleryCover && (
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                                                    Imagen de Portada (Splash Screen)
                                                </label>
                                                {editData.coverImage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditData({ ...editData, coverImage: "" })}
                                                        className="text-[10px] text-red-500 hover:text-red-400 font-medium"
                                                    >
                                                        Eliminar
                                                    </button>
                                                )}
                                            </div>

                                            {editData.coverImage ? (
                                                <div className="space-y-3">
                                                    <FocalPointPicker
                                                        imageUrl={`/api/cloud/thumbnail?c=${selectedProject?.cloudAccountId}&f=${editData.coverImage}&s=800`}
                                                        value={editData.coverImageFocus || "50,50"}
                                                        onChange={(value) => setEditData({ ...editData, coverImageFocus: value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCoverPicker(true)}
                                                        className="text-xs text-neutral-400 hover:text-white transition"
                                                    >
                                                        Cambiar imagen
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCoverPicker(true)}
                                                    className="w-full h-24 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs">Seleccionar imagen de Drive</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

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

                                    {/* Imagen de fondo del header */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                                                Imagen de Fondo del Header
                                            </label>
                                            {editData.headerImage && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditData({ ...editData, headerImage: "" })}
                                                    className="text-[10px] text-red-500 hover:text-red-400 font-medium"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>

                                        {editData.headerImage ? (
                                            <div className="space-y-3">
                                                <FocalPointPicker
                                                    imageUrl={`/api/cloud/thumbnail?c=${selectedProject?.cloudAccountId}&f=${editData.headerImage}&s=800`}
                                                    value={editData.headerImageFocus || "50,50"}
                                                    onChange={(value) => setEditData({ ...editData, headerImageFocus: value })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowHeaderImagePicker(true)}
                                                    className="text-xs text-neutral-400 hover:text-white transition"
                                                >
                                                    Cambiar imagen
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowHeaderImagePicker(true)}
                                                className="w-full h-20 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs">Seleccionar imagen de Drive</span>
                                            </button>
                                        )}
                                        <p className="text-[9px] text-neutral-500 mt-1">Se mostrará como fondo del header de la galería</p>
                                    </div>
                                </div>


                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                    <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border md:col-span-2`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Download className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium">Permisos de Descarga</span>
                                        </div>

                                        <div className="space-y-3 pl-0 md:pl-7">
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
                                                            <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>
                                                                {planLimits?.lowResDownloads ? 'JPG (Resolución Web)' : 'JPG (Alta Resolución)'}
                                                                {planLimits?.lowResDownloads && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">Plan Free</span>}
                                                            </span>
                                                            <span className="text-[9px] text-neutral-500">
                                                                {planLimits?.lowResDownloads ? 'Máximo 1200px' : 'Archivos listos para impresión'}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={editData.downloadJpgEnabled}
                                                            onChange={(e) => setEditData({ ...editData, downloadJpgEnabled: e.target.checked })}
                                                            className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                        />
                                                    </label>
                                                    <label className={`flex items-center justify-between ${planLimits?.lowResDownloads ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} group`}>
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm hover:opacity-100 transition-colors ${isLight ? 'text-neutral-600 hover:text-black' : 'text-neutral-400 hover:text-white'}`}>
                                                                Archivos RAW
                                                                {planLimits?.lowResDownloads && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">Pro req.</span>}
                                                            </span>
                                                            <span className="text-[9px] text-neutral-500">Negativos digitales originales</span>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={planLimits?.lowResDownloads ? false : editData.downloadRawEnabled}
                                                            disabled={!!planLimits?.lowResDownloads}
                                                            onChange={(e) => {
                                                                if (planLimits?.lowResDownloads) return;
                                                                setEditData({ ...editData, downloadRawEnabled: e.target.checked });
                                                            }}
                                                            className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700 disabled:opacity-50"
                                                        />
                                                    </label>

                                                    {/* Video Tab Toggle */}
                                                    <div className={`mt-4 pt-4 border-t ${isLight ? 'border-neutral-200' : 'border-neutral-700/50'}`}>
                                                        <label className="flex items-center justify-between cursor-pointer group mb-3">
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-medium hover:opacity-100 transition-colors ${isLight ? 'text-neutral-700 hover:text-black' : 'text-neutral-300 hover:text-white'}`}>Mostrar pestaña de Videos</span>
                                                                {planLimits?.videoEnabled === false ? (
                                                                    <span className="text-[9px] text-amber-400">Tu plan no incluye video. <a href="/pricing" className="underline">Actualizar</a></span>
                                                                ) : (
                                                                    <span className="text-[9px] text-neutral-500">Habilita la pestaña. Agrega los videos desde "Organizar".</span>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={editData.enableVideoTab}
                                                                disabled={planLimits?.videoEnabled === false}
                                                                onChange={(e) => {
                                                                    if (planLimits?.videoEnabled === false) {
                                                                        alert('\u26a0\ufe0f Tu plan no incluye video\n\nActualiza tu plan para habilitar galer\u00edas de video.');
                                                                        return;
                                                                    }
                                                                    setEditData({ ...editData, enableVideoTab: e.target.checked });
                                                                }}
                                                                className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700 disabled:opacity-50"
                                                            />
                                                        </label>

                                                        {/* Video Download Options - only show if video tab is enabled */}
                                                        {editData.enableVideoTab && (
                                                            <>
                                                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Descargas de Video</span>
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
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ZIP File Download Selector */}
                                    <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border md:col-span-2`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <Download className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-medium">Archivo ZIP de Descarga</span>
                                        </div>
                                        <div className="space-y-3 pl-0 md:pl-7">
                                            <p className={`text-xs ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                Vincula un archivo ZIP de tu Google Drive para que los clientes puedan descargarlo con un solo clic.
                                            </p>
                                            {editData.zipFileId ? (
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl ${isLight ? 'bg-white border border-neutral-200' : 'bg-neutral-900 border border-neutral-700'}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M21 8v13H3V8" />
                                                            <path d="M1 3h22v5H1z" />
                                                            <path d="M10 12h4" />
                                                        </svg>
                                                        <span className="text-sm truncate">{editData.zipFileName || 'Archivo seleccionado'}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowZipFilePicker(true)}
                                                        className="text-xs text-neutral-400 hover:text-white transition"
                                                    >
                                                        Cambiar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditData({ ...editData, zipFileId: '', zipFileName: '' })}
                                                        className="text-xs text-red-400 hover:text-red-300 transition"
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowZipFilePicker(true)}
                                                    className={`w-full py-3 px-4 border border-dashed rounded-xl flex items-center justify-center gap-2 transition-colors ${isLight
                                                        ? 'border-neutral-300 hover:border-blue-400 text-neutral-500 hover:text-blue-600 hover:bg-blue-50'
                                                        : 'border-neutral-700 hover:border-blue-500 text-neutral-400 hover:text-blue-400 hover:bg-blue-500/5'
                                                        }`}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    <span className="text-sm">Seleccionar archivo ZIP de Drive</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Settings Grid - 2 columns on desktop */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                                    </svg>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">Marca de Agua</span>
                                                        <span className="text-[10px] text-neutral-500">Simulada. En plan gratuito se añade el imagotipo de Closerlens</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={editData.enableWatermark}
                                                    onChange={(e) => setEditData({ ...editData, enableWatermark: e.target.checked })}
                                                    className="w-5 h-5 accent-emerald-500 rounded bg-neutral-700"
                                                />
                                            </label>
                                        </div>

                                        <div className={`${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-800/50 border-neutral-800'} p-4 rounded-2xl border`}>
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <ExternalLink className="w-4 h-4 text-neutral-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm">Perfil Público</span>
                                                        <span className="text-[10px] text-neutral-500">Muestra en portafolio</span>
                                                    </div>
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
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        Protección por Contraseña
                                        {planLimits?.passwordProtection === false && (
                                            <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Plan Free</span>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <Shield className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${planLimits?.passwordProtection === false ? 'text-neutral-600' : 'text-neutral-500'}`} />
                                        <input
                                            type="text"
                                            disabled={planLimits?.passwordProtection === false}
                                            placeholder={planLimits?.passwordProtection === false ? "Función no disponible en tu plan" : (selectedProject.passwordProtected ? "•••••••• (Contraseña activa)" : "Introduce una contraseña para bloquear")}
                                            value={editData.password}
                                            onChange={(e) => {
                                                if (planLimits?.passwordProtection === false) return;
                                                const val = e.target.value;
                                                setEditData({
                                                    ...editData,
                                                    password: val,
                                                    public: val.trim() !== "" ? false : editData.public
                                                });
                                            }}
                                            className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${isLight
                                                ? 'bg-neutral-50 border-neutral-200 text-black focus:border-emerald-500'
                                                : 'bg-neutral-800/50 border-neutral-800 text-white focus:border-emerald-500'
                                                } ${planLimits?.passwordProtection === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        {planLimits?.passwordProtection === false && (
                                            <div className="absolute inset-0 z-10 cursor-not-allowed" title="Actualiza tu plan para proteger con contraseña" onClick={() => alert('🔒 Función Premium\n\nProtege tus galerías con contraseña actualizando tu plan.')} />
                                        )}
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
                )
                }
            </div >

            {/* Cover Image Picker Modal */}
            {
                showCoverPicker && selectedProject && (
                    <DriveFilePicker
                        cloudAccountId={selectedProject.cloudAccountId}
                        folderId={selectedProject.rootFolderId}
                        selectedFileId={editData.coverImage || null}
                        onSelect={(fileId) => {
                            setEditData({ ...editData, coverImage: fileId });
                            setShowCoverPicker(false);
                        }}
                        onCancel={() => setShowCoverPicker(false)}
                    />
                )
            }

            {/* Header Image Picker Modal */}
            {
                showHeaderImagePicker && selectedProject && (
                    <DriveFilePicker
                        cloudAccountId={selectedProject.cloudAccountId}
                        folderId={selectedProject.rootFolderId}
                        selectedFileId={editData.headerImage || null}
                        onSelect={(fileId) => {
                            setEditData({ ...editData, headerImage: fileId });
                            setShowHeaderImagePicker(false);
                        }}
                        onCancel={() => setShowHeaderImagePicker(false)}
                    />
                )
            }

            {/* ZIP File Picker Modal */}
            {
                showZipFilePicker && selectedProject && (
                    <ZipFilePicker
                        cloudAccountId={selectedProject.cloudAccountId}
                        folderId={selectedProject.rootFolderId}
                        selectedFileId={editData.zipFileId || null}
                        onSelect={(fileId, fileName) => {
                            setEditData({ ...editData, zipFileId: fileId, zipFileName: fileName });
                            setShowZipFilePicker(false);
                        }}
                        onCancel={() => setShowZipFilePicker(false)}
                    />
                )
            }
        </div >
    );
}
