"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
    User, Building, Globe, Instagram, Phone, FileText, Save,
    Loader2, Camera, X, Check, Copy, ExternalLink,
    Sun, Moon, Monitor, Maximize, MousePointer2, Info, Folder,
    Image as ImageIcon, Link2, Eye, Linkedin, Youtube, Video, AtSign, MapPin,
    CreditCard, Cloud, Trash2, Calendar, Lock, Facebook, Twitter, Plus, ChevronDownIcon, Upload, Move
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from "@dnd-kit/sortable";
import { SortableProjectItem } from "@/components/dashboard/SortableProjectItem";
import FocalPointPicker from "@/components/FocalPointPicker";

import { getPlanConfig } from "@/lib/plans.config";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [planConfig, setPlanConfig] = useState<any>(null); // Store effective config
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useState({
        id: "",
        name: "",
        email: "",
        businessName: "",
        businessLogo: "",
        businessWebsite: "",
        businessInstagram: "",
        businessPhone: "",
        bio: "",
        specialty: "",
        theme: "dark",
        businessLogoScale: 100,
        // Perfil expandido
        profileType: "",
        headline: "",
        pronouns: "",
        location: "",
        coverImage: "",
        coverImageFocus: "50,50",
        callToAction: { label: "", url: "", type: "" },
        bookingWindow: 4, // Default 4 weeks
        bookingLeadTime: 1, // Default 1 day buffer
        socialLinks: {} as Record<string, string>,
        username: "",
        // Plan y cuentas
        plan: null as any,
        featureOverrides: null as any,
        planExpiresAt: null as string | null,
        cloudAccounts: [] as any[],
        projects: [] as any[],
        effectiveConfig: null as any // Add this for typing if needed
    });

    // Derived state for UI locks
    const bioMaxLength = planConfig?.limits?.bioMaxLength || 150;
    const maxSocialLinks = planConfig?.limits?.maxSocialLinks || 1;
    const advancedSocialAllowed = planConfig?.features?.advancedSocialNetworks || false;
    const isProfessionalProfile = planConfig?.features?.professionalProfile || false;
    const isCoverImageAllowed = planConfig?.features?.coverImage ?? isProfessionalProfile; // Specific or fallback to bundle
    const isCTAAllowed = planConfig?.features?.callToAction ?? isProfessionalProfile; // Specific or fallback to bundle
    const isBookingConfigAllowed = (planConfig?.features?.bookingConfig ?? isProfessionalProfile) || isCTAAllowed; // Booking config is linked to CTA or Pro logic
    const isCustomFieldsAllowed = planConfig?.features?.customFields ?? isProfessionalProfile; // Headline, Location, etc.
    const isRestrictedPlan = !advancedSocialAllowed; // Keep legacy variable for social, but use logic above

    // Helper for locked inputs
    const LockedOverlay = ({ label = "Plan Profesional" }: { label?: string }) => (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-black/80 text-white px-2 py-1 rounded text-[10px] font-bold border border-white/10 pointer-events-none z-10">
            <Lock className="w-3 h-3 text-emerald-400" /> <span>{label}</span>
        </div>
    );

    // Note: isRestrictedPlan logic is tricky with overrides. 
    // If we override advancedSocialAllowed=true, then they are effectively not restricted functionality-wise, 
    // but their "Plan Name" is still 'free'. 
    // We should trust the 'advancedSocialAllowed' flag for UI locks.

    // Dynamic Social Links State
    const [selectedNetwork, setSelectedNetwork] = useState("instagram");
    const [networkValue, setNetworkValue] = useState("");

    const SOCIAL_PLATFORMS = [
        { id: 'instagram', label: 'Instagram', icon: Instagram, prefix: '@', placeholder: 'usuario' },
        { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, prefix: 'linkedin.com/in/', placeholder: 'usuario' },
        { id: 'youtube', label: 'YouTube', icon: Youtube, prefix: 'youtube.com/@', placeholder: 'canal' },
        { id: 'vimeo', label: 'Vimeo', icon: Video, prefix: 'vimeo.com/', placeholder: 'usuario' },
        { id: 'website', label: 'Sitio Web', icon: Globe, prefix: 'https://', placeholder: 'tu-sitio.com' },
        { id: 'facebook', label: 'Facebook', icon: Facebook, prefix: 'facebook.com/', placeholder: 'usuario' },
        { id: 'twitter', label: 'X / Twitter', icon: Twitter, prefix: 'x.com/', placeholder: 'usuario' },
    ];

    const handleAddSocial = () => {
        if (!networkValue.trim()) return;

        // Enforce Max Social Links
        const currentLinksCount = Object.keys(user.socialLinks || {}).length;
        if (maxSocialLinks !== -1 && currentLinksCount >= maxSocialLinks) {
            alert(`Tu plan solo permite ${maxSocialLinks} enlace(s) social(es). Actualiza tu plan para añadir más.`);
            return;
        }

        setUser(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [selectedNetwork]: networkValue.trim()
            }
        }));
        setNetworkValue("");
    };

    const handleRemoveSocial = (key: string) => {
        const newLinks = { ...user.socialLinks };
        delete newLinks[key];
        setUser(prev => ({ ...prev, socialLinks: newLinks }));
    };

    useEffect(() => {
        fetch("/api/user/settings")
            .then((res) => res.json())
            .then((data) => {
                if (data.user) {
                    setUser({
                        id: data.user.id || "",
                        name: data.user.name || "",
                        email: data.user.email || "",
                        businessName: data.user.businessName || "",
                        businessLogo: data.user.businessLogo || "",
                        businessWebsite: data.user.businessWebsite || "",
                        businessInstagram: data.user.businessInstagram || "",
                        businessPhone: data.user.businessPhone || "",
                        bio: data.user.bio || "",
                        specialty: data.user.specialty || "",
                        theme: data.user.theme || "dark",
                        businessLogoScale: data.user.businessLogoScale || 100,
                        // Perfil expandido
                        profileType: data.user.profileType || "",
                        headline: data.user.headline || "",
                        pronouns: data.user.pronouns || "",
                        location: data.user.location || "",
                        coverImage: data.user.coverImage || "",
                        coverImageFocus: data.user.coverImageFocus || "50,50",
                        callToAction: data.user.callToAction || { label: "", url: "", type: "" },
                        bookingWindow: data.user.bookingWindow !== undefined ? data.user.bookingWindow : 4,
                        bookingLeadTime: data.user.bookingLeadTime !== undefined ? data.user.bookingLeadTime : 1,
                        socialLinks: data.user.socialLinks || {},
                        username: data.user.username || "",
                        // Plan y cuentas
                        plan: data.user.plan || null,
                        featureOverrides: data.user.featureOverrides || null,
                        planExpiresAt: data.user.planExpiresAt || null,
                        cloudAccounts: data.user.cloudAccounts || [],
                        projects: data.user.projects || [],
                        effectiveConfig: data.effectiveConfig || null
                    });
                    if (data.effectiveConfig) {
                        setPlanConfig(data.effectiveConfig);
                    }
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setUser((prev) => {
                const publicProjects = prev.projects.filter(p => p.public);
                const oldIndex = publicProjects.findIndex((p) => p.id === active.id);
                const newIndex = publicProjects.findIndex((p) => p.id === over?.id);

                // Reorder visible list
                const newPublicOrder = arrayMove(publicProjects, oldIndex, newIndex);

                // Merge back into full list
                // Create a map of updated indices/order for the public items
                // Actually, just save the API order is enough for backend
                // For frontend, we need to reconstruct user.projects maintaining other items?
                // Simplest strategy: just reorder user.projects completely if they are all public?
                // Or map the new order.

                // Better approach:
                // Extract public ones, reorder them.
                // Reconstruct full list by replacing the public segment or just putting them in their new relative positions?
                // Since 'projects' is array of all projects, mixing public and private.

                // Let's assume we want to update the profileOrder field in local state too?
                // Or just the array position.
                // The UI maps `user.projects.filter(p => p.public)`. 
                // So if we update the `profileOrder` locally it might not help unless we sort by it.
                // But typically user.projects is just a list.

                // Let's reorder the logic:
                // 1. Get current public projects
                // 2. Perform arrayMove on that subset
                // 3. Update the global projects array to reflect this new order of public items (keeping non-public items where they are? or just grouping?)

                // Since this UI view IS the "Public Galleries" list, let's treat these as the ones we care about ordering.

                const newOrderedIds = newPublicOrder.map(p => p.id);

                // Send to API
                fetch("/api/projects/reorder", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderedIds: newOrderedIds }),
                }).catch(console.error);

                // Update local state:
                // We need to keep the non-public projects too.
                const nonPublicProjects = prev.projects.filter(p => !p.public);

                // It's tricky to keep original interleaving if we only reorder public.
                // But usually we just want public ones to appear in a specific order in UI.
                // Let's just concat: Public (Ordered) + Private.
                // Or keep original array but swap positions?

                // Simplest for now: Public (ordered) + Non-Public
                // This might change their position in other lists but "Public Galleries" section only shows public ones.

                return {
                    ...prev,
                    projects: [...newPublicOrder, ...nonPublicProjects]
                };
            });
        }
    };

    const toggleProfileVisibility = async (projectId: string, currentStatus: boolean) => {
        try {
            const res = await fetch("/api/projects", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: projectId,
                    showInProfile: !currentStatus
                }),
            });

            if (!res.ok) throw new Error("Failed to update visibility");

            // Update local state
            setUser(prev => ({
                ...prev,
                projects: prev.projects.map(p =>
                    p.id === projectId ? { ...p, showInProfile: !currentStatus } : p
                )
            }));
        } catch (err) {
            console.error(err);
            alert("No se pudo actualizar la visibilidad en el perfil.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("El logo es demasiado pesado. Máximo 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            let result = event.target?.result as string;

            // Extensive SVG compatibility fix
            if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
                if (!result.startsWith('data:image/svg+xml')) {
                    // Try to force correct mime type
                    result = result.replace('data:image/octet-stream', 'data:image/svg+xml')
                        .replace('data:text/plain', 'data:image/svg+xml');
                }
            }

            setUser({ ...user, [uploadTarget || 'businessLogo']: result });
        };
        reader.onerror = () => {
            alert("Error al leer el archivo.");
        };

        // Use readAsDataURL which is usually safe for both PNG and SVG
        reader.readAsDataURL(file);
    };

    const handleUploadClick = (target: 'coverImage' | 'businessLogo') => {
        // Trigger file input
        if (fileInputRef.current) {
            // Store which field we are updating in a way handleFileChange knows? 
            // Actually handleFileChange currently updates 'businessLogo' hardcoded.
            // We need to update handleFileChange to support dynamic fields or use a stateRef.
            // Let's modify handleFileChange first or use a simple hack if time is tight.
            // Better: update handleFileChange to check a ref or just use separate inputs? 
            // Re-using single input is best but we need to know context.
            // Let's attach a temporary property to the ref or use a state 'uploadTarget'.
            setUploadTarget(target);
            fileInputRef.current.click();
        }
    };
    const [uploadTarget, setUploadTarget] = useState<'coverImage' | 'businessLogo' | null>(null);
    const [isRepositioning, setIsRepositioning] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.details || "Error updating settings");
            }

            const data = await res.json();
            if (data.user) {
                setUser(prev => ({
                    ...prev,
                    id: data.user.id || "",
                    name: data.user.name || "",
                    email: data.user.email || "",
                    businessName: data.user.businessName || "",
                    businessLogo: data.user.businessLogo || "",
                    businessWebsite: data.user.businessWebsite || "",
                    businessInstagram: data.user.businessInstagram || "",
                    businessPhone: data.user.businessPhone || "",
                    bio: data.user.bio || "",
                    specialty: data.user.specialty || "",
                    theme: data.user.theme || "dark",
                    businessLogoScale: data.user.businessLogoScale || 100,
                    // Perfil expandido
                    profileType: data.user.profileType || "",
                    headline: data.user.headline || "",
                    location: data.user.location || "",
                    socialLinks: data.user.socialLinks || {},
                    username: data.user.username || "",
                }));
            }
            alert("¡Identidad guardada con éxito!");
        } catch (err: any) {
            console.error(err);
            alert(`Hubo un error al guardar los cambios: ${err.message} `);
        } finally {
            setSaving(false);
        }
    };

    const copyProfileLink = () => {
        const url = `${window.location.origin}/p/${user.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-neutral-500 gap-2 bg-black">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando identidad...
            </div>
        );
    }

    const isLight = user.theme === 'light';

    return (
        <div className={cn(
            "min-h-[calc(100vh-6rem)] -m-4 md:-m-8 lg:-m-12 p-4 md:p-8 lg:p-12 transition-colors duration-500",
            isLight ? "bg-white text-neutral-900" : "bg-neutral-950 text-neutral-100"
        )}>
            <header className={cn(
                "mb-8 md:mb-12 flex flex-col gap-4 md:gap-6 border-b pb-6 md:pb-8 transition-colors duration-500",
                isLight ? "border-neutral-200" : "border-neutral-900"
            )}>
                <div>
                    <h1 className={cn("text-xl md:text-3xl lg:text-4xl font-light mb-2 md:mb-4 transition-colors", isLight ? "text-neutral-900" : "text-white")}>
                        Editar perfil
                    </h1>
                    <p className="text-neutral-500 text-xs md:text-sm italic">Define tu presencia digital.</p>
                </div>
                <div className={cn(
                    "flex items-center gap-2 md:gap-4 p-1.5 md:p-2 rounded-xl md:rounded-2xl border transition-all self-start",
                    isLight ? "bg-neutral-50 border-neutral-200" : "bg-neutral-900/50 border-neutral-800"
                )}>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Tema</span>
                    <button
                        onClick={() => setUser({ ...user, theme: isLight ? 'dark' : 'light' })}
                        className={cn(
                            "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl transition text-[10px] md:text-xs font-medium",
                            isLight
                                ? "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                        )}
                    >
                        {isLight ? <Moon className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Sun className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                        <span className="hidden sm:inline">{isLight ? 'Modo Oscuro' : 'Modo Claro'}</span>
                    </button>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10 md:space-y-16">
                {/* BASIC INFO */}
                <section>
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <User className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Información básica
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 md:gap-8">

                        <div className="space-y-2 md:space-y-3">
                            <label className="text-[9px] md:text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Nombre profesional</label>
                            <input
                                type="text"
                                value={user.name}
                                onChange={(e) => setUser({ ...user, name: e.target.value })}
                                className={cn(
                                    "w-full border rounded-lg md:rounded-xl px-4 md:px-5 py-3 md:py-4 outline-none transition-all text-sm",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                                placeholder="Tu nombre o estudio"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Correo de contacto</label>
                            <input
                                type="email"
                                value={user.email}
                                onChange={(e) => setUser({ ...user, email: e.target.value })}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-600 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-400 focus:border-emerald-500/50"
                                )}
                                placeholder="tu@correo.com"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">
                                Biografía / Reseña corta
                                {bioMaxLength && (
                                    <span className={`ml-2 ${user.bio.length >= bioMaxLength ? 'text-red-400' : 'text-neutral-500'}`}>
                                        ({user.bio.length}/{bioMaxLength})
                                    </span>
                                )}
                            </label>
                            <textarea
                                value={user.bio}
                                onChange={(e) => {
                                    const newBio = bioMaxLength
                                        ? e.target.value.slice(0, bioMaxLength)
                                        : e.target.value;
                                    setUser({ ...user, bio: newBio });
                                }}
                                maxLength={bioMaxLength || undefined}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 h-32 outline-none transition-all resize-none leading-relaxed",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                                placeholder="Cuéntale a tus clientes quién eres y tu estilo..."
                            />
                            {bioMaxLength && (
                                <p className="text-[10px] text-neutral-500 ml-1">
                                    Tu plan permite hasta {bioMaxLength} caracteres. <Link href="/pricing" className="text-emerald-500 hover:underline">Actualizar plan</Link>
                                </p>
                            )}
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Especialidad / Tagline</label>
                            <input
                                value={user.specialty}
                                onChange={(e) => setUser({ ...user, specialty: e.target.value })}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                                placeholder="Ej: Fotografía de bodas & retrato"
                            />
                        </div>
                    </div>
                </section>

                {/* PROFILE TYPE */}
                <section>
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <User className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Perfil Profesional
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Tipo de Perfil</label>
                            <div className="relative">
                                <select
                                    value={user.profileType}
                                    onChange={(e) => setUser({ ...user, profileType: e.target.value })}
                                    disabled={!isProfessionalProfile}
                                    className={cn(
                                        "w-full border rounded-xl px-5 py-4 outline-none transition-all appearance-none",
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50",
                                        !isProfessionalProfile && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <option value="">Selecciona...</option>
                                    <option value="photographer">📷 Fotógrafo</option>
                                    <option value="model">💃 Modelo / Talento</option>
                                    <option value="creative">🎬 Creativo Audiovisual</option>
                                    <option value="agency">🏢 Agencia</option>
                                    <option value="brand">🛍️ Marca</option>
                                </select>
                                {!isProfessionalProfile && <LockedOverlay />}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Ubicación</label>
                            <div className="relative">
                                <input
                                    value={user.location}
                                    placeholder="San Pedro Garza García, NL"
                                    onChange={(e) => setUser({ ...user, location: e.target.value })}
                                    disabled={!isCustomFieldsAllowed}
                                    className={cn(
                                        "w-full border rounded-xl px-5 py-4 pl-11 outline-none transition-all",
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50",
                                        !isCustomFieldsAllowed && "opacity-50 cursor-not-allowed"
                                    )}
                                />
                                {!isCustomFieldsAllowed && <LockedOverlay />}
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Headline (Profesión/Título)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={user.headline || ""}
                                    onChange={(e) => setUser({ ...user, headline: e.target.value })}
                                    disabled={!isCustomFieldsAllowed}
                                    className={cn(
                                        "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50",
                                        !isCustomFieldsAllowed && "opacity-50 cursor-not-allowed"
                                    )}
                                    placeholder="Ej: Director de Fotografía | Especialista en Moda"
                                />
                                {!isCustomFieldsAllowed && <LockedOverlay />}
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">
                                Username (URL personalizada)
                                {isRestrictedPlan && <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20"><Lock className="w-2.5 h-2.5" /> PRO</span>}
                            </label>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>closerlens.com/u/</span>
                                <div className="relative flex-1">
                                    <input
                                        value={user.username}
                                        onChange={(e) => setUser({ ...user, username: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                                        disabled={isRestrictedPlan}
                                        className={cn(
                                            "w-full border rounded-xl px-5 py-4 outline-none transition-all font-mono",
                                            isLight
                                                ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                                : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50",
                                            isRestrictedPlan && "opacity-50 cursor-not-allowed"
                                        )}
                                        placeholder={isRestrictedPlan ? "Solo disponible en planes PRO" : "tu-nombre"}
                                    />
                                    {isRestrictedPlan && <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />}
                                </div>
                            </div>
                            {user.username && (
                                <p className="text-[10px] text-emerald-500 ml-1">Tu perfil estará en: closerlens.com/u/{user.username}</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* COVER IMAGE */}
                <section>
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <ImageIcon className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Imagen de Portada
                    </div>

                    <div className="relative group">
                        {!isCoverImageAllowed && <LockedOverlay />}

                        <div className={cn(
                            "w-full h-32 md:h-48 rounded-2xl overflow-hidden relative border transition-colors",
                            isLight
                                ? "bg-neutral-100 border-neutral-200"
                                : "bg-neutral-900 border-neutral-800",
                            !isCoverImageAllowed && "opacity-40 grayscale"
                        )}>
                            {user.coverImage ? (
                                isRepositioning ? (
                                    <div className="absolute inset-0 z-10 bg-black">
                                        <FocalPointPicker
                                            imageUrl={user.coverImage}
                                            value={user.coverImageFocus || "50,50"}
                                            onChange={(val) => setUser({ ...user, coverImageFocus: val })}
                                            className="w-full h-full"
                                        />
                                    </div>
                                ) : (
                                    <img
                                        src={user.coverImage}
                                        className="w-full h-full object-cover"
                                        alt="Cover"
                                        style={{ objectPosition: user.coverImageFocus?.replace(',', ' ') || 'center' }}
                                    />
                                )
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <ImageIcon className="w-10 h-10" />
                                </div>
                            )}

                            {/* Buttons only accessible if allowed */}
                            <div className={cn(
                                "absolute bottom-3 right-3 flex gap-2",
                                !isCoverImageAllowed && "pointer-events-none display-none" // Extra safety
                            )}>
                                <button
                                    type="button"
                                    onClick={() => handleUploadClick('coverImage')}
                                    disabled={!isCoverImageAllowed}
                                    className="p-2 md:px-4 md:py-2 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur-md text-xs font-bold transition flex items-center gap-2"
                                >
                                    <Upload className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden md:inline">Subir</span>
                                </button>
                                {user.coverImage && isCoverImageAllowed && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setIsRepositioning(!isRepositioning)}
                                            className={cn(
                                                "p-2 md:px-4 md:py-2 rounded-lg text-white backdrop-blur-md text-xs font-bold transition flex items-center gap-2",
                                                isRepositioning ? "bg-emerald-500 hover:bg-emerald-600" : "bg-black/50 hover:bg-black/70"
                                            )}
                                        >
                                            {isRepositioning ? <Check className="w-3 h-3 md:w-4 md:h-4" /> : <Move className="w-3 h-3 md:w-4 md:h-4" />}
                                            <span className="hidden md:inline">{isRepositioning ? "Listo" : "Mover"}</span>
                                        </button>
                                    </>
                                )}
                                {user.coverImage && isCoverImageAllowed && (
                                    <button
                                        type="button"
                                        onClick={() => setUser({ ...user, coverImage: "" })}
                                        className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md transition"
                                    >
                                        <X className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SOCIAL LINKS */}
                <section>
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <Link2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Redes Sociales
                    </div>

                    <div className="space-y-6">
                        {/* List of Added Networks */}
                        <div className="space-y-3">
                            {Object.entries(user.socialLinks || {}).map(([key, value]) => {
                                const platform = SOCIAL_PLATFORMS.find(p => p.id === key);
                                const Icon = platform ? platform.icon : Link2;
                                return (
                                    <div key={key} className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all",
                                        isLight ? "bg-white border-neutral-200" : "bg-neutral-900 border-neutral-800"
                                    )}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={cn(
                                                "p-2 rounded-full",
                                                isLight ? "bg-neutral-100 text-neutral-600" : "bg-neutral-800 text-neutral-400"
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{platform?.label || key}</span>
                                                <span className="text-sm truncate font-medium">{platform?.prefix}{value}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveSocial(key)}
                                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add New Network */}
                        <div className={cn(
                            "p-4 rounded-2xl border border-dashed transition-all",
                            isLight ? "bg-neutral-50/50 border-neutral-200" : "bg-neutral-900/30 border-neutral-800"
                        )}>
                            <div className="flex flex-col md:flex-row gap-3">
                                {/* Network Selector */}
                                <div className="md:w-auto">
                                    <div className="relative">
                                        <select
                                            value={selectedNetwork}
                                            onChange={(e) => setSelectedNetwork(e.target.value)}
                                            className={cn(
                                                "w-full md:w-48 appearance-none rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium pr-10 cursor-pointer",
                                                isLight
                                                    ? "bg-white border border-neutral-200 text-neutral-900 focus:border-emerald-500"
                                                    : "bg-neutral-900 border border-neutral-800 text-neutral-100 focus:border-emerald-500"
                                            )}
                                        >

                                            {SOCIAL_PLATFORMS.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                            <ChevronDownIcon />
                                        </div>
                                    </div>
                                </div>

                                {/* Input & Add Button */}
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            value={networkValue}
                                            onChange={(e) => setNetworkValue(e.target.value)}
                                            placeholder={SOCIAL_PLATFORMS.find(p => p.id === selectedNetwork)?.placeholder || "Usuario o URL"}
                                            disabled={!advancedSocialAllowed && selectedNetwork !== 'instagram'}
                                            className={cn(
                                                "w-full md:w-64 border rounded-xl px-4 py-3 outline-none transition-all text-sm",
                                                isLight
                                                    ? "bg-white border-neutral-200 text-neutral-900 focus:border-emerald-500"
                                                    : "bg-neutral-900 border-neutral-800 text-neutral-100 focus:border-emerald-500",
                                                (!advancedSocialAllowed && selectedNetwork !== 'instagram') && "opacity-50 cursor-not-allowed"
                                            )}
                                        />
                                        {/* Prefix hint if needed or generic */}
                                        {(!advancedSocialAllowed && selectedNetwork !== 'instagram') && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-black/80 text-white px-2 py-1 rounded text-[10px] font-bold border border-white/10 pointer-events-none z-10">
                                                <Lock className="w-3 h-3 text-orange-400" /> <span>PRO</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleAddSocial}
                                        disabled={!networkValue.trim() || (!advancedSocialAllowed && selectedNetwork !== 'instagram')}
                                        className={cn(
                                            "p-3 rounded-xl flex items-center justify-center transition-all",
                                            (!advancedSocialAllowed && selectedNetwork !== 'instagram')
                                                ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                                                : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                        )}
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <p className="mt-2 text-[10px] text-neutral-500 pl-1">
                                {!advancedSocialAllowed && selectedNetwork !== 'instagram'
                                    ? "Actualiza a PRO para añadir más redes sociales como LinkedIn, YouTube y Web."
                                    : "Añade el enlace o usuario de tu red social."}
                            </p>
                        </div>
                    </div>
                </section>

                {/* IMAGE / LOGO */}
                <section>
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <Camera className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Logo del Negocio
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                        {/* Logo Upload */}
                        <div className="relative">
                            {!isProfessionalProfile && <LockedOverlay />}
                            <div className={cn(
                                "w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center relative overflow-hidden shrink-0 border transition-all",
                                isLight
                                    ? "bg-neutral-100 border-neutral-200"
                                    : "bg-neutral-900 border-neutral-800",
                                !isProfessionalProfile && "opacity-40 grayscale"
                            )}>
                                {user.businessLogo ? (
                                    <img
                                        src={user.businessLogo}
                                        alt="Logo"
                                        className="max-h-full max-w-full object-contain transition-transform duration-300"
                                        style={{ transform: `scale(${user.businessLogoScale / 100})` }}
                                    />
                                ) : (
                                    <Camera className={cn("w-6 h-6 md:w-8 md:h-8", isLight ? "text-neutral-300" : "text-neutral-700")} />
                                )}
                                <div className={cn(
                                    "absolute inset-0 flex items-center justify-center gap-2 bg-black/40 backdrop-blur-[1px] opacity-100 transition-opacity",
                                    !isProfessionalProfile && "hidden"
                                )}>
                                    <button
                                        type="button"
                                        onClick={() => handleUploadClick('businessLogo')}
                                        disabled={!isProfessionalProfile}
                                        className="px-3 py-1.5 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-white backdrop-blur-md transition flex items-center gap-1.5 shadow-lg"
                                    >
                                        <Upload className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">Subir</span>
                                    </button>
                                    {user.businessLogo && (
                                        <button
                                            type="button"
                                            onClick={() => setUser({ ...user, businessLogo: "" })}
                                            disabled={!isProfessionalProfile}
                                            className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md transition"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Logo Settings */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Escala del Logo (%)</label>
                                <div className="space-y-2 relative">
                                    <div className="flex items-center justify-between text-xs font-mono opacity-60">
                                        <span>20%</span>
                                        <span>{user.businessLogoScale || 100}%</span>
                                        <span>200%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="200"
                                        value={user.businessLogoScale || 100}
                                        onChange={(e) => setUser({ ...user, businessLogoScale: parseInt(e.target.value) })}
                                        disabled={!isProfessionalProfile}
                                        className={cn(
                                            "w-full h-2 rounded-lg appearance-none cursor-pointer",
                                            isLight ? "bg-neutral-200 accent-neutral-900" : "bg-neutral-800 accent-white",
                                            !isProfessionalProfile && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                    {!isProfessionalProfile && (
                                        <div className="absolute inset-0 z-20 cursor-not-allowed"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CALL TO ACTION */}
                <section>
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <MousePointer2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Call to Action (Botón Principal)
                        {!isCTAAllowed && <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20"><Lock className="w-2.5 h-2.5" /> PRO</span>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Texto del botón</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={user.callToAction?.label || ""}
                                    onChange={(e) => setUser({
                                        ...user,
                                        callToAction: { ...user.callToAction, label: e.target.value }
                                    })}
                                    disabled={!isCTAAllowed}
                                    className={cn(
                                        "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50",
                                        !isCTAAllowed && "opacity-50 cursor-not-allowed"
                                    )}
                                    placeholder={user.callToAction?.type === 'booking' ? "Ej: Agenda tu sesión" : "Ej: Ver portafolio"}
                                />
                                {!isCTAAllowed && <LockedOverlay />}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Tipo de Acción</label>
                            <div className="grid grid-cols-2 gap-2 relative">
                                {!isCTAAllowed && (
                                    <div className="absolute inset-0 z-20 cursor-not-allowed"></div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setUser({ ...user, callToAction: { ...user.callToAction, type: 'link' } })}
                                    disabled={!isCTAAllowed}
                                    className={cn(
                                        "px-4 py-3 rounded-lg text-sm font-medium border transition-all",
                                        user.callToAction?.type !== 'booking'
                                            ? (isLight ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-black border-white")
                                            : (isLight ? "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300" : "bg-neutral-900/30 text-neutral-400 border-neutral-800 hover:border-neutral-700"),
                                        !isCTAAllowed && "opacity-50"
                                    )}
                                >
                                    Enlace Externo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUser({ ...user, callToAction: { ...user.callToAction, type: 'booking' } })}
                                    disabled={!isCTAAllowed}
                                    className={cn(
                                        "px-4 py-3 rounded-lg text-sm font-medium border transition-all",
                                        user.callToAction?.type === 'booking'
                                            ? (isLight ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-black border-white")
                                            : (isLight ? "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300" : "bg-neutral-900/30 text-neutral-400 border-neutral-800 hover:border-neutral-700"),
                                        !isCTAAllowed && "opacity-50"
                                    )}
                                >
                                    Formulario de Reserva
                                </button>
                            </div>
                        </div>

                        {/* URL INPUT ONLY FOR LINK TYPE */}
                        {user.callToAction?.type !== 'booking' && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Enlace (URL)</label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        value={user.callToAction?.url || ""}
                                        onChange={(e) => setUser({
                                            ...user,
                                            callToAction: { ...user.callToAction, url: e.target.value }
                                        })}
                                        disabled={!isCTAAllowed}
                                        className={cn(
                                            "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                            isLight
                                                ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                                : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50",
                                            !isCTAAllowed && "opacity-50 cursor-not-allowed"
                                        )}
                                        placeholder="https://mysite.com"
                                    />
                                    {!isCTAAllowed && <LockedOverlay />}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Booking Window - Only visible for Pro plans (as Free plan has no CTA) */}
                    {/* Booking Window - Controlled by bookingConfig feature */}
                    <div className="mt-6 md:mt-8 grid md:grid-cols-2 gap-4 md:gap-8 relative">
                        {/* BOOKING CONFIG - LINKED TO CTA */}
                        {/* Lock Overlay if neither booking config nor CTA is allowed */}
                        {!isBookingConfigAllowed && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[1px] rounded-xl">
                                <div className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-xs font-bold border border-white/10 shadow-xl">
                                    <Lock className="w-4 h-4 text-emerald-400" />
                                    <span>Disponible con Call to Action o Plan Profesional</span>
                                </div>
                            </div>
                        )}

                        <div className={cn("space-y-3", !isBookingConfigAllowed && "opacity-20 pointer-events-none")}>
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Ventana de Reservas</label>
                            <p className="text-xs text-neutral-500 mb-2">Cuanto tiempo hacia el futuro pueden reservar.</p>
                            <select
                                value={user.bookingWindow ?? 4}
                                onChange={(e) => setUser({ ...user, bookingWindow: parseInt(e.target.value) })}
                                disabled={!isBookingConfigAllowed}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                            >
                                <option value={1}>1 Semana</option>
                                <option value={2}>2 Semanas</option>
                                <option value={3}>3 Semanas</option>
                                <option value={4}>4 Semanas</option>
                                <option value={0}>Sin límite (Todo el calendario)</option>
                            </select>
                        </div>
                        <div className={cn("space-y-3", !isBookingConfigAllowed && "opacity-20 pointer-events-none")}>
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Anticipación Mínima (Días)</label>
                            <p className="text-xs text-neutral-500 mb-2">Días de buffer antes de la primera fecha disponible.</p>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={user.bookingLeadTime ?? 1}
                                onChange={(e) => setUser({ ...user, bookingLeadTime: parseInt(e.target.value) })}
                                disabled={!isBookingConfigAllowed}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                            />
                        </div>
                    </div>
                </section>

                {/* PUBLIC GALLERIES */}
                < section >
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <Eye className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Galerías públicas
                    </div>

                    <div className="grid gap-2 md:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {user.projects.filter(p => p.public).length === 0 ? (
                            <div className={cn(
                                "col-span-full py-10 rounded-2xl border border-dashed text-center text-sm transition-colors",
                                isLight ? "border-neutral-200 text-neutral-400" : "border-neutral-800 text-neutral-600"
                            )}>
                                No hay galerías públicas. Marca una galería como pública desde el dashboard.
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={user.projects.filter(p => p.public).map(p => p.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    {user.projects.filter(p => p.public).map((project) => (
                                        <SortableProjectItem
                                            key={project.id}
                                            project={project}
                                            isLight={isLight}
                                            toggleVisibility={toggleProfileVisibility}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </section >

                {/* ACCOUNT & PLAN */}
                < section >
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <CreditCard className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Cuenta y Plan
                    </div>

                    {/* Current Plan */}
                    <div className={`p-5 md:p-6 rounded-2xl border mb-6 ${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/50 border-neutral-800'}`}>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xl font-medium ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                                        {user.plan?.displayName || 'Free'}
                                    </span>
                                    {user.plan && user.plan.name !== 'free' && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full uppercase">
                                            Activo
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                    {user.plan?.price ? (
                                        <>${user.plan.price} {user.plan.currency}/{user.plan.interval === 'month' ? 'mes' : 'año'}</>
                                    ) : (
                                        <>Plan gratuito - sin costo</>
                                    )}
                                </p>
                                {user.planExpiresAt && (
                                    <p className="flex items-center gap-1 text-xs text-neutral-500 mt-2">
                                        <Calendar className="w-3 h-3" />
                                        Vence: {new Date(user.planExpiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                            <Link
                                href="/#pricing"
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${isLight ? 'bg-neutral-900 text-white hover:bg-black' : 'bg-white text-black hover:bg-neutral-200'}`}
                            >
                                {user.plan?.name === 'free' || !user.plan ? 'Actualizar Plan' : 'Cambiar Plan'}
                            </Link>
                        </div>
                    </div>

                    {/* Connected Cloud Accounts */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-bold opacity-40 uppercase tracking-widest ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                Cuentas de nube conectadas
                            </span>
                            <Link
                                href="/dashboard/clouds"
                                className="text-xs text-emerald-500 hover:text-emerald-400 transition"
                            >
                                + Conectar
                            </Link>
                        </div>
                        {user.cloudAccounts.length === 0 ? (
                            <div className={`p-4 rounded-xl border-2 border-dashed text-center ${isLight ? 'border-neutral-200 text-neutral-500' : 'border-neutral-800 text-neutral-600'}`}>
                                <Cloud className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay cuentas conectadas</p>
                                <Link href="/dashboard/clouds" className="text-xs text-emerald-500 hover:underline">
                                    Conecta Google Drive
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {user.cloudAccounts.map((account: any) => (
                                    <div
                                        key={account.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${account.provider === 'google' ? 'bg-sky-500/20' : 'bg-neutral-500/20'}`}>
                                                <Cloud className={`w-4 h-4 ${account.provider === 'google' ? 'text-sky-400' : 'text-neutral-400'}`} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                                                    {account.name || account.email || 'Google Drive'}
                                                </p>
                                                <p className="text-xs text-neutral-500">
                                                    {account.email || account.provider}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-neutral-500">
                                            {new Date(account.createdAt).toLocaleDateString('es-MX')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section >

                {/* ACTIONS */}
                < footer className={
                    cn(
                        "pt-6 md:pt-10 border-t flex flex-col md:flex-row flex-wrap items-center justify-center md:justify-between gap-4 md:gap-6 transition-colors",
                        isLight ? "border-neutral-200" : "border-neutral-900"
                    )
                } >
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4">
                        <button
                            type="button"
                            onClick={copyProfileLink}
                            className={cn(
                                "flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full text-[10px] md:text-xs transition font-bold border",
                                isLight
                                    ? "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-white"
                                    : "bg-neutral-900/50 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                            )}
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            Copiar Link
                        </button>
                        <Link
                            href={`/p/${user.id}`}
                            target="_blank"
                            className="flex items-center gap-2 text-xs md:text-sm text-neutral-500 hover:text-emerald-500 transition"
                        >
                            <Eye className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Ver perfil</span>
                        </Link>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className={cn(
                            "flex items-center justify-center gap-2 md:gap-3 px-8 md:px-12 py-3 md:py-4 rounded-full font-bold transition-all shadow-xl disabled:opacity-50 text-sm md:text-base",
                            isLight
                                ? "bg-neutral-900 text-white hover:bg-black shadow-neutral-200/50"
                                : "bg-white text-black hover:bg-neutral-200 shadow-white/5"
                        )}
                    >
                        {saving ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Save className="w-3 h-3 md:w-4 md:h-4" />}
                        Guardar
                    </button>
                </footer >
            </form >

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.svg,image/svg+xml"
                className="hidden"
            />
        </div >
    );
}
