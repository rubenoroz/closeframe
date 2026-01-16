"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
    User, Building, Globe, Instagram, Phone, FileText, Save,
    Loader2, Camera, X, Check, Copy, ExternalLink,
    Sun, Moon, Monitor, Maximize, MousePointer2, Info, Folder,
    Image as ImageIcon, Link2, Eye, Linkedin, Youtube, Video, AtSign, MapPin,
    CreditCard, Cloud, Trash2, Calendar, Lock, Facebook, Twitter, Plus, ChevronDownIcon
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
        location: "",
        socialLinks: {} as Record<string, string>,
        username: "",
        // Plan y cuentas
        plan: null as any,
        planExpiresAt: null as string | null,
        cloudAccounts: [] as any[],
        projects: [] as any[],
    });

    // Parse plan limits for restrictions
    const getPlanLimits = () => {
        if (!user.plan?.limits) return null;
        try {
            return typeof user.plan.limits === 'string'
                ? JSON.parse(user.plan.limits)
                : user.plan.limits;
        } catch {
            return null;
        }
    };
    const planLimits = getPlanLimits();
    const bioMaxLength = planLimits?.bioMaxLength || null;
    const maxSocialLinks = planLimits?.maxSocialLinks ?? -1; // -1 = unlimited
    // Restricción de redes sociales (Solo IG en Free)
    // Restricción de redes sociales (Solo IG en Free)
    // "Free", "Gratis", "Basic" or NULL defines the restricted plan.
    const currentPlanName = user.plan?.name || 'free';
    const isRestrictedPlan = /free|gratis|basic|prueba/i.test(currentPlanName);
    const advancedSocialAllowed = planLimits?.advancedSocialNetworks ?? !isRestrictedPlan;

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
                        location: data.user.location || "",
                        socialLinks: data.user.socialLinks || {},
                        username: data.user.username || "",
                        // Plan y cuentas
                        plan: data.user.plan || null,
                        planExpiresAt: data.user.planExpiresAt || null,
                        cloudAccounts: data.user.cloudAccounts || [],
                        projects: data.user.projects || [],
                    });
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

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

            setUser({ ...user, businessLogo: result });
        };
        reader.onerror = () => {
            alert("Error al leer el archivo.");
        };

        // Use readAsDataURL which is usually safe for both PNG and SVG
        reader.readAsDataURL(file);
    };

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
                            <select
                                value={user.profileType}
                                onChange={(e) => setUser({ ...user, profileType: e.target.value })}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                            >
                                <option value="">Selecciona...</option>
                                <option value="photographer">📷 Fotógrafo</option>
                                <option value="model">💃 Modelo / Talento</option>
                                <option value="creative">🎬 Creativo Audiovisual</option>
                                <option value="agency">🏢 Agencia</option>
                                <option value="brand">🛍️ Marca</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Ubicación</label>
                            <input
                                value={user.location}
                                onChange={(e) => setUser({ ...user, location: e.target.value })}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                                placeholder="Ej: Ciudad de México, México"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Headline Profesional</label>
                            <input
                                value={user.headline}
                                onChange={(e) => setUser({ ...user, headline: e.target.value })}
                                className={cn(
                                    "w-full border rounded-xl px-5 py-4 outline-none transition-all",
                                    isLight
                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                        : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                )}
                                placeholder="Ej: Director de Fotografía | Especialista en Moda"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Username (URL personalizada)</label>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>closerlens.co/u/</span>
                                <input
                                    value={user.username}
                                    onChange={(e) => setUser({ ...user, username: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                                    className={cn(
                                        "flex-1 border rounded-xl px-5 py-4 outline-none transition-all font-mono",
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                    )}
                                    placeholder="tu-nombre"
                                />
                            </div>
                            {user.username && (
                                <p className="text-[10px] text-emerald-500 ml-1">Tu perfil estará en: closerlens.co/u/{user.username}</p>
                            )}
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
                        <ImageIcon className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Logo
                    </div>

                    <div className="flex flex-col items-center gap-6 md:gap-10">
                        <div className="relative group">
                            <div className={cn(
                                "w-24 h-24 md:w-32 md:h-32 rounded-full border flex items-center justify-center overflow-hidden p-3 md:p-4 shadow-2xl transition-colors",
                                isLight ? "bg-white border-neutral-200" : "bg-neutral-900 border-neutral-800"
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
                            </div>
                            {user.businessLogo && (
                                <button
                                    onClick={() => setUser({ ...user, businessLogo: "" })}
                                    className="absolute -top-1 -right-1 p-1 md:p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
                                >
                                    <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 space-y-4 md:space-y-6 w-full max-w-sm">
                            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 md:px-8 py-2.5 md:py-3 rounded-full bg-white text-black text-xs md:text-sm font-bold hover:bg-neutral-200 transition"
                                >
                                    Subir imagen
                                </button>
                                <p className="text-[9px] md:text-[10px] text-neutral-500 text-center sm:text-left">PNG o SVG recomendado</p>
                            </div>

                            {user.businessLogo && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
                                        <span>Tamaño del logo</span>
                                        <span className="text-emerald-500">{user.businessLogoScale}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="200"
                                        value={user.businessLogoScale}
                                        onChange={(e) => setUser({ ...user, businessLogoScale: parseInt(e.target.value) })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-colors",
                                            isLight ? "bg-neutral-200" : "bg-neutral-800"
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* LINKS */}
                <section>
                    <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">
                        <Link2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" /> Links y redes
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Instagram (@usuario)</label>
                            <div className="relative">
                                <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                                <input
                                    type="text"
                                    value={user.businessInstagram}
                                    onChange={(e) => setUser({ ...user, businessInstagram: e.target.value })}
                                    className={cn(
                                        "w-full border rounded-xl pl-12 pr-5 py-4 outline-none transition-all",
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                    )}
                                    placeholder="@tu_perfil"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Sitio Web (URL)</label>
                            <div className="relative">
                                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                                <input
                                    type="url"
                                    value={user.businessWebsite}
                                    onChange={(e) => setUser({ ...user, businessWebsite: e.target.value })}
                                    className={cn(
                                        "w-full border rounded-xl pl-12 pr-5 py-4 outline-none transition-all",
                                        isLight
                                            ? "bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:border-emerald-500/50"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-100 focus:border-emerald-500/50"
                                    )}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* PUBLIC GALLERIES */}
                <section>
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
                            user.projects.filter(p => p.public).map((project) => (
                                <motion.div
                                    key={project.id}
                                    whileHover={{ scale: 1.01 }}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                                        isLight
                                            ? "bg-white border-neutral-200 hover:border-emerald-500/30"
                                            : "bg-neutral-900/30 border-neutral-800 hover:bg-neutral-900 ml-0"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center transition-colors",
                                            isLight ? "bg-neutral-100 border border-neutral-100" : "bg-neutral-800 border border-neutral-700"
                                        )}>
                                            {project.coverImage ? (
                                                <img src={project.coverImage} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <Folder className={cn("w-4 h-4", isLight ? "text-neutral-300" : "text-neutral-600")} />
                                            )}
                                        </div>
                                        <span className={cn("text-sm font-medium", isLight ? "text-neutral-900" : "text-white")}>{project.name}</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={project.showInProfile}
                                        onChange={() => toggleProfileVisibility(project.id, project.showInProfile)}
                                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                                    />
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* ACCOUNT & PLAN */}
                <section>
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
                                href="/pricing"
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
                </section>

                {/* ACTIONS */}
                <footer className={cn(
                    "pt-6 md:pt-10 border-t flex flex-col md:flex-row flex-wrap items-center justify-center md:justify-between gap-4 md:gap-6 transition-colors",
                    isLight ? "border-neutral-200" : "border-neutral-900"
                )}>
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
                </footer>
            </form>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.svg,image/svg+xml"
                className="hidden"
            />
        </div>
    );
}
