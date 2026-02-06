"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus, Search, Settings, ExternalLink, Calendar,
    MoreHorizontal, Trash2, Layout, Copy, AlertCircle,
    ChevronRight, Check, Image as ImageIcon, Video,
    Folder, Download, Type, X, Shield, Sparkles,
    Link as LinkIcon, MoreVertical, Loader2, Save
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import DriveFilePicker from "@/components/DriveFilePicker";
import ZipFilePicker from "@/components/ZipFilePicker";
import FocalPointPicker from "@/components/FocalPointPicker";
import MusicPicker from "@/components/MusicPicker";
import CollaborativeSettings from "@/components/gallery/CollaborativeSettings";
import GallerySettingsForm, { GallerySettingsData } from "@/components/gallery/GallerySettingsForm";



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
    const [searchTerm, setSearchTerm] = useState("");


    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const [planLimits, setPlanLimits] = useState<{
        videoEnabled?: boolean;
        allowedLowRes?: boolean;
        allowedHighRes?: boolean;
        passwordProtection?: boolean;
        galleryCover?: boolean;
        closerGalleries?: boolean;
        collaborativeGalleries?: boolean;
    } | null>(null);
    const [showZipFilePicker, setShowZipFilePicker] = useState(false);
    const isLight = theme === "light";
    const router = useRouter();

    // [NEW] Dynamically load fonts for preview
    useEffect(() => {
        if (selectedProject) {
            const fonts = ["DM Sans", "Fraunces", "Playfair Display", "Cormorant", "Allura"];
            const linkId = "preview-fonts";
            if (!document.getElementById(linkId)) {
                const link = document.createElement("link");
                link.id = linkId;
                link.rel = "stylesheet";
                link.href = `https://fonts.googleapis.com/css2?family=${fonts.map(f => f.replace(/ /g, "+")).join("&family=")}:wght@400;700&display=swap`;
                document.head.appendChild(link);
            }
        }
    }, [selectedProject]);

    const [editData, setEditData] = useState<{
        name: string;
        coverImage: string;
        password: string | null;
        downloadEnabled: boolean;
        downloadJpgEnabled: boolean;
        downloadRawEnabled: boolean;
        downloadVideoHdEnabled: boolean;
        downloadVideoRawEnabled: boolean;
        enableVideoTab: boolean;
        enableWatermark: boolean;
        category: string;
        headerTitle: string;
        headerFontFamily: string;
        headerFontSize: number;
        headerColor: string;
        headerBackground: "dark" | "light" | string; // loose type to match
        headerImage: string;
        headerImageFocus: string;
        coverImageFocus: string;
        zipFileId: string;
        zipFileName: string;
        public: boolean;
        layoutType: "mosaic" | "grid" | string;
        isCloserGallery: boolean;
        musicTrackId: string;
        musicEnabled: boolean;
        isCollaborative?: boolean;
        moments?: string[];
        date?: string;
        slug?: string;
    }>({
        name: "",
        coverImage: "",
        password: "" as string | null,
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
        layoutType: "mosaic",
        isCloserGallery: false,
        musicTrackId: "",
        musicEnabled: false,
    });


    const fetchData = () => {
        setLoading(true);
        // Fetch projects
        const projectsPromise = fetch("/api/projects").then(res => res.json());
        // Fetch user settings (for ID)
        const settingsPromise = fetch("/api/user/settings").then(res => res.json());
        // Fetch features (New System)
        const featuresPromise = fetch("/api/features/me", { cache: 'no-store', headers: { 'Pragma': 'no-cache' } }).then(res => res.json());

        Promise.all([projectsPromise, settingsPromise, featuresPromise])
            .then(([projectsData, settingsData, featuresData]) => {
                if (projectsData.projects) setProjects(projectsData.projects);
                if (settingsData.user) {
                    setUserId(settingsData.user.id);
                    setTheme(settingsData.user.theme || "dark");
                    setProfileViews(settingsData.user.profileViews || 0);
                    setUsername(settingsData.user.username || null);
                    setProfileViews(settingsData.user.profileViews || 0);
                    setUsername(settingsData.user.username || null);

                    // Use Features from /api/features/me (Modular System)
                    if (featuresData.features) {
                        const f = featuresData.features;
                        console.log("DEBUG: Features from API:", f);
                        setPlanLimits({
                            videoEnabled: f.videoGallery ?? f.videoEnabled ?? false,
                            allowedLowRes: f.lowResDownloads ?? false,
                            allowedHighRes: f.highResDownloads ?? false,
                            passwordProtection: f.passwordProtection ?? true,
                            galleryCover: f.galleryCover ?? f.coverImage ?? false,
                            closerGalleries: f.closerGalleries ?? f.zipDownloadsEnabled === true,
                            collaborativeGalleries: f.collaborativeGalleries ?? false
                        });
                        console.log("DEBUG: Plan Limits Set (API):", {
                            low: f.lowResDownloads,
                            high: f.highResDownloads
                        });
                    } else if (settingsData.effectiveConfig?.features) {
                        const features = settingsData.effectiveConfig.features;
                        setPlanLimits({
                            // New names OR legacy names from DB
                            videoEnabled: features.videoGallery ?? features.videoEnabled ?? false,
                            allowedLowRes: features.lowResDownloads ?? false,
                            allowedHighRes: features.highResDownloads ?? false,
                            passwordProtection: features.passwordProtection ?? true,
                            galleryCover: features.galleryCover ?? features.coverImage ?? false,
                            closerGalleries: features.closerGalleries ?? features.zipDownloadsEnabled === true, // Proxy for Studio
                            collaborativeGalleries: features.collaborativeGalleries ?? false
                        });
                    } else if (settingsData.user.plan?.limits) {
                        try {
                            const limits = typeof settingsData.user.plan.limits === 'string'
                                ? JSON.parse(settingsData.user.plan.limits)
                                : settingsData.user.plan.limits;
                            // Map legacy field names from DB to what dashboard expects
                            setPlanLimits({
                                videoEnabled: limits.videoEnabled ?? false,
                                allowedLowRes: limits.lowResDownloads ?? false,
                                allowedHighRes: limits.highResDownloads ?? false,
                                passwordProtection: limits.passwordProtection ?? true,
                                galleryCover: limits.coverImage ?? limits.galleryCover ?? false,
                                closerGalleries: limits.closerGalleries ?? limits.zipDownloadsEnabled === true,
                                collaborativeGalleries: limits.collaborativeGalleries ?? false
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
            password: project.passwordProtected ? "" : null,
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
            layoutType: (project as any).layoutType || "mosaic",
            isCloserGallery: project.isCloserGallery || false,
            musicTrackId: project.musicTrackId || "",
            musicEnabled: project.musicEnabled || false, // [NEW]
        });
        setActiveMenu(null);
    };

    const handleUpdateProject = async () => {
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
                    // Force downloadEnabled to false if NO downloads are allowed
                    downloadEnabled: (!planLimits?.allowedHighRes && !planLimits?.allowedLowRes) ? false : editData.downloadEnabled,
                    downloadJpgEnabled: editData.downloadJpgEnabled,
                    downloadRawEnabled: editData.downloadRawEnabled,
                    downloadVideoHdEnabled: editData.downloadVideoHdEnabled,
                    downloadVideoRawEnabled: editData.downloadVideoRawEnabled,
                    enableVideoTab: editData.enableVideoTab,
                    enableWatermark: editData.enableWatermark,
                    // Force Personal/Inter if High Res is NOT allowed (Free plan restriction)
                    category: !planLimits?.allowedHighRes ? "personal" : editData.category,
                    headerTitle: editData.headerTitle,
                    headerFontFamily: !planLimits?.allowedHighRes ? "Inter" : editData.headerFontFamily,
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
                    layoutType: editData.layoutType,
                    isCloserGallery: editData.isCloserGallery,
                    musicTrackId: editData.musicTrackId,
                    musicEnabled: editData.musicEnabled, // [NEW] Autoplay
                })
            });

            if (res.ok) {
                setSelectedProject(null);
                fetchData();
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("Server error:", res.status, errorData);
                alert(`Error al guardar cambios (${res.status}): ` + (errorData.error || "Error desconocido"));
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
                    // Force downloadEnabled to false if NO downloads are allowed
                    downloadEnabled: (!planLimits?.allowedHighRes && !planLimits?.allowedLowRes) ? false : editData.downloadEnabled,
                    downloadJpgEnabled: editData.downloadJpgEnabled,
                    downloadRawEnabled: editData.downloadRawEnabled,
                    downloadVideoHdEnabled: editData.downloadVideoHdEnabled,
                    downloadVideoRawEnabled: editData.downloadVideoRawEnabled,
                    enableVideoTab: editData.enableVideoTab,
                    enableWatermark: editData.enableWatermark,
                    category: !planLimits?.allowedHighRes ? "personal" : editData.category,
                    headerTitle: editData.headerTitle,
                    headerFontFamily: !planLimits?.allowedHighRes ? "Inter" : editData.headerFontFamily,
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
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-light mb-1">Mis Galerías</h1>
                        <p className="text-neutral-500 text-xs md:text-sm mb-4 md:mb-0">Gestiona y comparte tus proyectos fotográficos.</p>
                    </div>

                    <div className={`flex items-center px-4 py-2.5 rounded-xl border transition-all w-full md:w-auto md:min-w-[300px] ${isLight ? 'bg-white border-neutral-200 focus-within:border-emerald-500 shadow-sm' : 'bg-neutral-900 border-neutral-800 focus-within:border-emerald-500'}`}>
                        <Search className="w-4 h-4 text-neutral-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar galería..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-500"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")}>
                                <X className="w-3 h-3 text-neutral-500 hover:text-neutral-300" />
                            </button>
                        )}
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

                {filteredProjects.length === 0 ? (
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
                        {filteredProjects.map(project => (
                            <div key={project.id} className={`group border rounded-2xl p-5 transition-all duration-300 flex flex-col min-h-[220px] relative ${isLight ? "bg-white border-neutral-100 hover:border-emerald-500 hover:shadow-xl hover:shadow-neutral-200/50" : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                                }`}>
                                {project.passwordProtected ? (
                                    <div className="absolute top-0 right-0 p-1.5 bg-emerald-600 text-white rounded-bl-lg rounded-tr-2xl shadow-lg z-10 flex items-center gap-1 px-2.5">
                                        <Shield className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Protegida</span>
                                    </div>
                                ) : project.public ? (
                                    <div className="absolute top-0 right-0 p-1.5 bg-blue-500 text-white rounded-bl-lg rounded-tr-2xl shadow-lg z-10 flex items-center gap-1 px-2.5">
                                        <ExternalLink className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Pública</span>
                                    </div>
                                ) : (
                                    <div className="absolute top-0 right-0 p-1.5 bg-neutral-500 text-white rounded-bl-lg rounded-tr-2xl shadow-lg z-10 flex items-center gap-1 px-2.5 opacity-50">
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

                                    </div>
                                </div>

                                <div className="absolute top-12 right-5 flex items-center gap-1">
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

                                        <div className={`flex items-center gap-2 text-[10px] font-medium ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                            <Calendar className="w-3 h-3" />
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {(project as any).isCloserGallery && (
                                    <div className={`absolute bottom-0 right-0 p-1.5 rounded-tl-lg rounded-br-2xl shadow-lg z-10 flex items-center gap-1.5 px-3 border-t border-l ${isLight
                                        ? "bg-neutral-100 border-neutral-200 text-emerald-600"
                                        : "bg-neutral-900 border-neutral-800 text-emerald-500"
                                        }`}>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Closer</span>
                                    </div>
                                )}
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
                        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setSelectedProject(null)}
                    >
                        <div
                            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl relative shadow-2xl ${isLight ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="absolute top-6 right-6 z-10 p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="p-8">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-light mb-2">Configuración de Galería</h2>
                                    <p className="text-sm text-neutral-500">Personaliza la apariencia y funcionalidades</p>
                                </div>

                                <GallerySettingsForm
                                    data={editData as unknown as GallerySettingsData}
                                    onChange={(newData) => setEditData(prev => ({ ...prev, ...newData }))}
                                    projectId={selectedProject.id}
                                    cloudAccountId={selectedProject.cloudAccountId}
                                    rootFolderId={selectedProject.rootFolderId}
                                    isGoogleDrive={selectedProject.cloudAccount?.provider === 'google'}
                                    isLight={isLight}
                                    onSave={handleUpdateProject}
                                    onCancel={() => setSelectedProject(null)}
                                    saveLabel="Guardar Cambios"
                                    isSaving={isSaving}
                                    planLimits={planLimits}
                                    showDelete={true}
                                    onDelete={() => handleDeleteProject(selectedProject.id)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
