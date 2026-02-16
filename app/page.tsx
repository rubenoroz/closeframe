import React from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { PlanBNavbar } from "@/components/landing/PlanBNavbar";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQModal } from "@/components/landing/FAQModal";
import { getRegionFromHeaders } from "@/lib/geo";
// We don't use next/image yet to keep compatibility with provided external URLs for the prototype
/* eslint-disable @next/next/no-img-element */



import Image from "next/image";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function PlanBPage() {
    const session = await auth();
    if (session?.user) {
        redirect("/dashboard");
    }
    // Detect visitor region from Vercel's geo headers
    const headersList = await headers();
    const region = getRegionFromHeaders(headersList);

    const rawPlans = await prisma.plan.findMany({
        orderBy: { sortOrder: 'asc' },
        where: { isActive: true }
    });

    const plans = rawPlans.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : [],
        limits: plan.limits ? JSON.parse(plan.limits) : {},
    }));
    return (
        <div className="bg-[#0a0a0a] font-[var(--font-spline)] text-white transition-colors duration-300 antialiased overflow-x-hidden min-h-screen">
            <div className="relative flex flex-col w-full">
                {/* Header */}
                <PlanBNavbar user={session?.user} />

                {/* Hero Section */}
                <section className="relative h-screen flex items-center pt-20 px-6 lg:px-20 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="/hero-photographer.jpg"
                            alt="Photographer taking a photo"
                            fill
                            className="object-cover scale-110 blur-[2px] opacity-60"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/20 to-[#0a0a0a]"></div>
                    </div>
                    <div className="relative z-10 max-w-[1400px] mx-auto w-full">
                        <div className="max-w-4xl">
                            <span className="inline-block px-4 py-1 mb-8 rounded-full bg-[#cdb8e1]/20 border border-[#cdb8e1]/30 text-[#cdb8e1] text-[10px] font-bold tracking-[0.2em] uppercase">FOTOGRAFOS · ACTORES · MODELOS · MÚSICOS · FAMILIAS · STUDIOS · AGENCIAS</span>
                            <h1 className="font-serif text-5xl md:text-7xl lg:text-[120px] font-light text-white mb-8 leading-[0.9] md:leading-[0.85] tracking-tight">
                                Tu nube, <br /><span className="italic text-[#cdb8e1] ml-0 md:ml-20">tu galería.</span>
                            </h1>
                            <div className="flex flex-col md:flex-row md:items-end gap-8">
                                <p className="text-xl md:text-2xl text-white/60 max-w-xl leading-relaxed font-light">
                                    Closerlens transforma tu almacenamiento en galerías premium, flujos de trabajo y experiencias para tus clientes. <span className="text-white">tu respaldo, su galería.</span>
                                </p>
                                <div className="flex gap-4">
                                    <Link href="/login" className="bg-[#cdb8e1] text-black h-16 px-10 rounded-full text-sm font-bold tracking-widest uppercase hover:scale-105 transition-all flex items-center justify-center">
                                        Empezar Ahora
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Scroll Section */}
                <section className="py-32 bg-[#0a0a0a] overflow-hidden" id="features">
                    <div className="max-w-[1400px] mx-auto px-6 lg:px-20 mb-16">
                        <div className="w-32 md:w-96 mb-2">
                            <img src="/logo-white.svg" alt="CloserLens" className="w-full h-auto object-contain" />
                        </div>
                        <h3 className="text-3xl md:text-5xl font-light text-[#cdb8e1] mb-2 tracking-tight leading-none">Más cerca. Más claro. Más tuyo.</h3>
                        <p className="text-white/40 text-xl font-light max-w-2xl leading-tight">Experiencias visuales creadas desde tu nube.</p>
                    </div>
                    <div className="space-y-2">
                        {/* Row 1: Right Scroll */}
                        <div className="relative overflow-hidden group">
                            <div className="flex gap-3 w-fit py-2 animate-scroll-right hover:[animation-play-state:paused]">
                                {/* Original Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Gallery Showcase" className="w-full h-full object-cover" src="/gallery-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-10 flex flex-col justify-center items-center text-center bg-white/5 backdrop-blur-xl border border-white/10 group">
                                    <h3 className="text-3xl font-bold mb-4 tracking-tight">Galerías Closer</h3>
                                    <p className="text-white/50 text-sm leading-relaxed max-w-xs">Transforma tus carpetas de Drive, OneDrive, Dropbox y Koofr en experiencias visuales de alto impacto.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[480px] bg-gradient-to-br from-neutral-900 to-black p-6 border border-white/10">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-5">
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Tu Nube Conectada</span>
                                        <span className="text-[9px] text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                                            <span className="size-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                            SINCRONIZADO
                                        </span>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex gap-5 h-[calc(100%-50px)]">
                                        {/* Left: Storage Circle */}
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="relative size-28">
                                                <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#gradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="66" className="animate-pulse" />
                                                    <defs>
                                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                            <stop offset="0%" stopColor="#cdb8e1" />
                                                            <stop offset="100%" stopColor="#8b5cf6" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-2xl font-bold">75%</span>
                                                    <span className="text-[8px] text-white/40 uppercase tracking-wider">Usado</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-white/50 mt-2">11.2 GB de 15 GB</span>
                                        </div>

                                        {/* Right: Cloud Services */}
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            {/* Connected Clouds - 2x2 Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="Drive" className="size-4" src="/assets/logos/drive.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">Drive</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="OneDrive" className="size-4" src="/assets/logos/onedrive.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">OneDrive</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="Dropbox" className="size-4" src="/assets/logos/dropbox.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">Dropbox</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="Koofr" className="size-4" src="/assets/logos/koofr.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">Koofr</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex gap-4 mt-3">
                                                <div className="text-center">
                                                    <span className="text-xl font-bold text-[#cdb8e1]">24</span>
                                                    <span className="text-[9px] text-white/40 block uppercase tracking-wider">Galerías</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-xl font-bold text-white">1,847</span>
                                                    <span className="text-[9px] text-white/40 block uppercase tracking-wider">Archivos</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Calendar" className="w-full h-full object-cover" src="/calendar-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-10 flex flex-col justify-center items-center text-center bg-[#cdb8e1]/10 border border-[#cdb8e1]/20 backdrop-blur-xl">
                                    <h3 className="text-3xl font-bold mb-4 tracking-tight">Agenda tus eventos</h3>
                                    <p className="text-white/70 text-sm leading-relaxed max-w-xs">Administra tu calendario y sesiones con un sistema de reservas integrado.</p>
                                </div>

                                {/* Duplicate Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Gallery Showcase" className="w-full h-full object-cover" src="/gallery-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-10 flex flex-col justify-center items-center text-center bg-white/5 backdrop-blur-xl border border-white/10 group">
                                    <h3 className="text-3xl font-bold mb-4 tracking-tight">Galerías Closer</h3>
                                    <p className="text-white/50 text-sm leading-relaxed max-w-xs">Transforma tus carpetas de Drive, OneDrive, Dropbox y Koofr en experiencias visuales de alto impacto.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[480px] bg-gradient-to-br from-neutral-900 to-black p-6 border border-white/10">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-5">
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Tu Nube Conectada</span>
                                        <span className="text-[9px] text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                                            <span className="size-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                            SINCRONIZADO
                                        </span>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex gap-5 h-[calc(100%-50px)]">
                                        {/* Left: Storage Circle */}
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="relative size-28">
                                                <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#gradient2)" strokeWidth="12" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="66" className="animate-pulse" />
                                                    <defs>
                                                        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                                                            <stop offset="0%" stopColor="#cdb8e1" />
                                                            <stop offset="100%" stopColor="#8b5cf6" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-2xl font-bold">75%</span>
                                                    <span className="text-[8px] text-white/40 uppercase tracking-wider">Usado</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-white/50 mt-2">11.2 GB de 15 GB</span>
                                        </div>

                                        {/* Right: Cloud Services */}
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            {/* Connected Clouds - 2x2 Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="Drive" className="size-4" src="/assets/logos/drive.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">Drive</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="OneDrive" className="size-4" src="/assets/logos/onedrive.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">OneDrive</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="Dropbox" className="size-4" src="/assets/logos/dropbox.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">Dropbox</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                    <img alt="Koofr" className="size-4" src="/assets/logos/koofr.svg" />
                                                    <span className="text-[10px] text-white/70 flex-1">Koofr</span>
                                                    <span className="size-1.5 rounded-full bg-green-400"></span>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex gap-4 mt-3">
                                                <div className="text-center">
                                                    <span className="text-xl font-bold text-[#cdb8e1]">24</span>
                                                    <span className="text-[9px] text-white/40 block uppercase tracking-wider">Galerías</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-xl font-bold text-white">1,847</span>
                                                    <span className="text-[9px] text-white/40 block uppercase tracking-wider">Archivos</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Calendar" className="w-full h-full object-cover" src="/calendar-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-10 flex flex-col justify-center items-center text-center bg-[#cdb8e1]/10 border border-[#cdb8e1]/20 backdrop-blur-xl">
                                    <h3 className="text-3xl font-bold mb-4 tracking-tight">Agenda tus eventos</h3>
                                    <p className="text-white/70 text-sm leading-relaxed max-w-xs">Administra tu calendario y sesiones con un sistema de reservas integrado.</p>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Left Scroll */}
                        <div className="relative overflow-hidden group">
                            <div className="flex gap-3 w-fit py-2 animate-scroll-left hover:[animation-play-state:paused]">
                                {/* Original Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] bg-white/5 backdrop-blur-xl border border-white/10 p-8 flex flex-col justify-center">
                                    <h3 className="text-2xl font-bold mb-4 tracking-tight">Organiza tus momentos</h3>
                                    <p className="text-white/50 text-sm leading-relaxed mb-4">Crea carpetas en tu nube y se convertirán automáticamente en secciones de tu galería.</p>
                                    <p className="text-white/40 text-xs leading-relaxed">Ceremonia, Recepción, Sesión de pareja... tus clientes navegan fácilmente entre cada momento especial.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Organizing photos" className="w-full h-full object-cover" src="/organize-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] bg-gradient-to-br from-[#cdb8e1]/20 to-black/80 backdrop-blur-xl border border-[#cdb8e1]/30 p-8 flex flex-col justify-center items-center text-center">
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Personaliza tus galerías</h3>
                                    <p className="text-white/60 text-sm leading-relaxed mb-2">Añade música de fondo y elige entre docenas de tipografías premium.</p>
                                    <p className="text-[#cdb8e1] text-xs font-medium">Tu marca, tu estilo ✨</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Music and Typography" className="w-full h-full object-cover" src="/music-typography-showcase.jpg" />
                                </div>

                                {/* Duplicate Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] bg-white/5 backdrop-blur-xl border border-white/10 p-8 flex flex-col justify-center">
                                    <h3 className="text-2xl font-bold mb-4 tracking-tight">Organiza tus momentos</h3>
                                    <p className="text-white/50 text-sm leading-relaxed mb-4">Crea carpetas en tu nube y se convertirán automáticamente en secciones de tu galería.</p>
                                    <p className="text-white/40 text-xs leading-relaxed">Ceremonia, Recepción, Sesión de pareja... tus clientes navegan fácilmente entre cada momento especial.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Organizing photos" className="w-full h-full object-cover" src="/organize-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] bg-gradient-to-br from-[#cdb8e1]/20 to-black/80 backdrop-blur-xl border border-[#cdb8e1]/30 p-8 flex flex-col justify-center items-center text-center">
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Personaliza tus galerías</h3>
                                    <p className="text-white/60 text-sm leading-relaxed mb-2">Añade música de fondo y elige entre docenas de tipografías premium.</p>
                                    <p className="text-[#cdb8e1] text-xs font-medium">Tu marca, tu estilo ✨</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Music and Typography" className="w-full h-full object-cover" src="/music-typography-showcase.jpg" />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Right Scroll */}
                        <div className="relative overflow-hidden group">
                            <div className="flex gap-4 w-fit py-2 animate-scroll-right hover:[animation-play-state:paused]">
                                {/* Original Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-8 flex flex-col justify-center bg-white/5 backdrop-blur-xl border border-white/10">
                                    <div className="flex gap-3 mb-4">
                                        <img alt="YouTube" className="size-8" src="/assets/logos/youtube.svg" />
                                        <img alt="Vimeo" className="size-8" src="/assets/logos/vimeo.svg" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Videos en tus Galerías</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">Tus recuerdos de la nube conviven con tus videos de YouTube y Vimeo en un mismo lugar.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Video player" className="w-full h-full object-cover" src="/video-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-8 flex flex-col justify-center bg-white/5 backdrop-blur-xl border border-white/10">
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Galerías Colaborativas</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">Permite que tus invitados compartan sus fotos directamente a tu galería mediante un código QR.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Collaborative gallery" className="w-full h-full object-cover" src="/collaborative-showcase.jpg" />
                                </div>

                                {/* Duplicate Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-8 flex flex-col justify-center bg-white/5 backdrop-blur-xl border border-white/10">
                                    <div className="flex gap-3 mb-4">
                                        <img alt="YouTube" className="size-8" src="/assets/logos/youtube.svg" />
                                        <img alt="Vimeo" className="size-8" src="/assets/logos/vimeo.svg" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Videos en tus Galerías</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">Tus recuerdos de la nube conviven con tus videos de YouTube y Vimeo en un mismo lugar.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Video player" className="w-full h-full object-cover" src="/video-showcase.jpg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] p-8 flex flex-col justify-center bg-white/5 backdrop-blur-xl border border-white/10">
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight">Galerías Colaborativas</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">Permite que tus invitados compartan sus fotos directamente a tu galería mediante un código QR.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Collaborative gallery" className="w-full h-full object-cover" src="/collaborative-showcase.jpg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Studio Section */}
                {/* Studio Section */}
                <section className="relative py-20 md:py-32 flex items-center overflow-hidden bg-black" id="studio">
                    <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 aspect-video rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative border-white/20 group">
                                <img alt="Studio Experience" className="w-full h-full object-cover" src="/studio-showcase.jpg" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 max-w-xl">
                            <span className="text-[#cdb8e1] font-black text-[10px] tracking-[0.4em] uppercase mb-6 block italic">FLUJO CREATIVO</span>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-[1.1] tracking-tighter text-white">Inmersión profesional <br />para tu flujo creativo.</h2>

                            <p className="text-xl text-white font-medium mb-6 leading-relaxed">
                                Trabaja con orden. Entrega con intención.
                            </p>

                            <p className="text-lg text-white/60 mb-8 font-light leading-relaxed">
                                CloserLens conecta tus proyectos, tu agenda y tus galerías en un solo lugar, para que te concentres en crear mientras todo lo demás fluye contigo.
                            </p>

                            <p className="text-sm text-white/40 font-medium leading-relaxed border-t border-white/10 pt-6 mt-8">
                                Pensado para <span className="text-white/70">fotógrafos, actores, modelos, músicos, familias, estudios y agencias</span> que buscan una experiencia clara, cuidada y verdaderamente premium.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Scena Section */}
                <section className="py-24 md:py-32 bg-black text-white overflow-hidden relative" id="scena">
                    <div className="max-w-[1400px] mx-auto px-6 lg:px-20 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">
                        <div>
                            <span className="text-[#cdb8e1] font-black text-[10px] tracking-[0.4em] uppercase mb-6 block italic">SCENA</span>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-[1.1] tracking-tighter">
                                Visualiza tu <br />
                                flujo de trabajo.
                            </h2>

                            <div className="space-y-8 text-lg font-light text-white/60 leading-relaxed md:max-w-lg">
                                <p>
                                    Deja de perderte entre pendientes, mensajes y fechas sueltas. <br />
                                    Scena te permite organizar tus proyectos en un tablero claro y flexible, pensado para flujos creativos reales.
                                </p>
                                <p>
                                    Empieza en Kanban para ver el estado de cada proyecto y, cuando lo necesites, conviértelo en una línea de tiempo tipo Gantt para planear entregas, sesiones y fechas clave.
                                </p>
                            </div>

                            <div className="mt-12 flex items-center gap-4">
                                <Link href="/login" className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-[#cdb8e1] transition-colors inline-flex items-center gap-2">
                                    Empezar ahora
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                        </div>

                        <div className="relative space-y-6">
                            {/* Gantt Image (Small/Top) */}
                            <div className="relative z-10 ml-auto w-[85%] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-[#1a1a1a]">
                                <img src="/scena-gantt.jpg" alt="Gantt View" className="w-full h-auto" />
                            </div>

                            {/* Kanban Image (Main/Bottom) */}
                            <div className="relative z-0 mr-auto w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-[#1a1a1a]">
                                <img src="/scena-kanban.jpg" alt="Kanban Board" className="w-full h-auto" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Family Portal Section */}
                <section className="py-16 md:py-24 bg-white text-black">
                    <div className="max-w-[1400px] mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
                        <div className="relative">
                            <div className="bg-gray-100 rounded-[2.5rem] overflow-hidden aspect-[4/3] relative shadow-lg group">
                                <img src="/family-showcase.jpg" alt="Family Memories" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#cdb8e1]"></div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tighter">CloserLens for Family</h2>

                            <div className="space-y-6 text-xl text-gray-500 font-light leading-relaxed mb-10 text-justify hyphens-auto">
                                <p>
                                    Un espacio pensado para compartir recuerdos sin complicaciones.
                                </p>
                                <p>
                                    Una interfaz clara, cálida y sencilla, diseñada para entregas familiares donde lo importante es disfrutar, no aprender a usar una plataforma.
                                </p>
                                <p>
                                    Botones grandes, acceso directo desde el correo y una experiencia optimizada para que todos —incluidos tíos y abuelos— puedan ver, descargar y compartir sin esfuerzo.
                                </p>
                            </div>

                            <ul className="space-y-3 text-gray-600 font-medium">
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#cdb8e1]">check_circle</span>
                                    Compartir fácilmente por WhatsApp
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#cdb8e1]">check_circle</span>
                                    Interfaz limpia, sin distracciones
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#cdb8e1]">check_circle</span>
                                    Imágenes optimizadas para móviles
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <PricingSection plans={plans} region={region} />

                {/* Footer */}
                <footer className="py-16 md:py-24 px-6 lg:px-20 border-t border-white/5 bg-black">
                    <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-20">
                        <div className="col-span-1 md:col-span-2">
                            <div className="w-56 mb-8 relative">
                                <img src="/logo-white.svg" alt="CloserLens" className="w-full h-auto object-contain" />
                            </div>
                            <p className="text-white/40 max-w-sm font-light leading-relaxed">Redefiniendo el estándar de entrega fotográfica. Tu infraestructura de Drive, nuestra cara de lujo.</p>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-10">Producto</h4>
                            <ul className="space-y-4 text-sm font-medium">
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Agenda</a></li>
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Scena</a></li>
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Galerías Closer</a></li>
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Galerías Colaborativas</a></li>
                                <li><FAQModal /></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-10">Legal</h4>
                            <ul className="space-y-4 text-sm font-medium text-white/40">
                                <li><Link className="hover:text-white transition-colors" href="/legal/terminos_y_condiciones_closerlens">Términos</Link></li>
                                <li><Link className="hover:text-white transition-colors" href="/legal/politica_de_privacidad_closerlens">Privacidad</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="max-w-[1400px] mx-auto mt-24 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <span className="text-[10px] text-white/20 tracking-widest uppercase font-bold">© 2024 CloserLens SaaS. Premium Creative Workflows.</span>
                        <div className="flex gap-8 text-[10px] font-black tracking-widest uppercase">
                            <a className="hover:text-[#cdb8e1] transition-colors" href="#">Instagram</a>
                            <a className="hover:text-[#cdb8e1] transition-colors" href="#">Twitter</a>
                        </div>
                    </div>
                    <p className="max-w-[900px] mx-auto mt-6 text-[12px] text-[#7A7A7A] text-center leading-relaxed">
                        Google Drive, Dropbox, YouTube, Vimeo y OneDrive son marcas registradas de sus respectivos propietarios. Galerías Closer no está afiliado ni respaldado por dichas compañías.
                    </p>
                </footer>

                {/* Sticky Bottom Bar */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl border-white/5 hover:bg-black/80 transition-all">
                    <span className="text-[10px] font-bold text-white/60 hidden lg:block tracking-widest uppercase">Eleva tu flujo de trabajo.</span>
                    <div className="flex gap-3">
                        <Link href="/login" className="bg-white text-black px-5 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-[#cdb8e1] transition-all flex items-center justify-center">Prueba Gratis</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
