"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Camera, Zap, ShieldCheck, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Plan {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    price: number;
    currency: string;
    interval: string;
    features: string[];
    sortOrder: number;
}

// Planes por defecto en caso de que la API falle
const defaultPlans = [
    {
        id: "free",
        name: "free",
        displayName: "Free",
        description: "Para probar CloserLens",
        price: 0,
        currency: "USD",
        interval: "month",
        features: ["Hasta 3 galerías", "1 nube conectada", "Galerías privadas", "Fotos y video"],
        sortOrder: 0
    },
    {
        id: "pro",
        name: "pro",
        displayName: "Pro",
        description: "Para creativos profesionales",
        price: 15,
        currency: "USD",
        interval: "month",
        features: ["Galerías ilimitadas", "Múltiples nubes", "Perfil público", "Branding personalizado"],
        sortOrder: 1
    },
    {
        id: "studio",
        name: "studio",
        displayName: "Studio",
        description: "Para estudios y agencias",
        price: 35,
        currency: "USD",
        interval: "month",
        features: ["Todo en Pro", "Gestión de talentos", "Dominio personalizado", "Soporte prioritario"],
        sortOrder: 2
    }
];

export default function LandingPage() {
    const [plans, setPlans] = useState<Plan[]>(defaultPlans);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/plans")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setPlans(data);
                }
            })
            .catch(err => console.error("Error loading plans:", err))
            .finally(() => setLoadingPlans(false));
    }, []);

    // Determinar cuál plan está destacado (el segundo, o el que tenga precio > 0 y no sea el más caro)
    const getHighlightIndex = () => {
        if (plans.length <= 1) return 0;
        if (plans.length === 2) return 1;
        return 1; // El del medio por defecto
    };

    const highlightIndex = getHighlightIndex();

    // Helper para obtener el CTA según el plan
    const getCta = (plan: Plan, index: number) => {
        if (plan.price === 0) return "Empezar gratis";
        if (index === highlightIndex) return `Elegir ${plan.displayName}`;
        if (plan.price >= 30) return "Contactar";
        return `Elegir ${plan.displayName}`;
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            {/* TOP NAV */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur border-b border-neutral-800">
                <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                    <span className="text-lg md:text-xl font-light tracking-tight">CloserLens</span>
                    <div className="flex items-center gap-3 md:gap-6">
                        <Link href="/dashboard" className="text-xs md:text-sm text-neutral-400 hover:text-white transition hidden sm:block">
                            Iniciar sesión
                        </Link>
                        <Link href="/dashboard">
                            <button className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-white text-black text-xs md:text-sm font-bold hover:bg-neutral-200 transition">
                                <span className="hidden sm:inline">Crear cuenta</span>
                                <span className="sm:hidden">Entrar</span>
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="px-4 md:px-6 pt-32 md:pt-48 pb-20 md:pb-32 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-neutral-900" />
                <div className="relative z-10 max-w-4xl mx-auto">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-light mb-6 md:mb-8 tracking-tight leading-tight"
                    >
                        Tu presencia visual<br />
                        <span className="text-neutral-500">profesional</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-neutral-400 max-w-2xl mx-auto mb-8 md:mb-12 text-sm md:text-lg px-4"
                    >
                        Portfolios, books y galerías para fotógrafos, modelos, creativos y agencias. Tu trabajo, presentado con intención.
                    </motion.p>
                    <Link href="/dashboard">
                        <button className="px-8 md:px-10 py-3 md:py-4 rounded-full bg-white text-black font-bold hover:scale-105 transition shadow-xl shadow-white/10 text-sm md:text-base">
                            Empieza gratis
                        </button>
                    </Link>
                </div>
            </section>

            {/* FEATURES */}
            <section className="px-4 md:px-6 py-16 md:py-24 max-w-6xl mx-auto relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    {[
                        {
                            icon: <Camera className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />,
                            title: "Portfolios premium",
                            desc: "Diseño limpio y profesional.",
                        },
                        {
                            icon: <Cloud className="w-5 h-5 md:w-6 md:h-6 text-sky-400" />,
                            title: "Conecta tu nube",
                            desc: "Google Drive, sin mover archivos.",
                        },
                        {
                            icon: <Zap className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />,
                            title: "Listo en minutos",
                            desc: "Crea y comparte al instante.",
                        },
                        {
                            icon: <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />,
                            title: "Control total",
                            desc: "Galerías públicas o privadas.",
                        },
                    ].map((f, i) => (
                        <div key={i} className="p-4 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-800 bg-neutral-900/20 backdrop-blur-sm hover:border-neutral-700 transition">
                            <div className="mb-3 md:mb-5 p-2 md:p-3 w-fit rounded-lg md:rounded-xl bg-neutral-800">{f.icon}</div>
                            <h3 className="text-base md:text-xl mb-2 md:mb-3 font-light">{f.title}</h3>
                            <p className="text-xs md:text-sm text-neutral-500 leading-relaxed hidden sm:block">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* FOR WHO - NEW SECTION */}
            <section className="px-4 md:px-6 py-16 md:py-24 border-t border-neutral-800">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10 md:mb-16">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 tracking-tight">
                            Para quién es <span className="text-emerald-400">CloserLens</span>
                        </h2>
                        <p className="text-neutral-500 text-sm md:text-base">Una lente más cercana a lo que haces.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        {[
                            { emoji: "📷", title: "Fotógrafos", desc: "Galerías de entrega y portafolio" },
                            { emoji: "💃", title: "Modelos", desc: "Books digitales profesionales" },
                            { emoji: "🎬", title: "Creativos", desc: "Showreels y proyectos" },
                            { emoji: "🏢", title: "Agencias", desc: "Gestión de talentos" },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="p-5 md:p-8 rounded-2xl border border-neutral-800 bg-neutral-900/30 hover:border-emerald-500/50 hover:bg-neutral-900/50 transition-all cursor-default text-center"
                            >
                                <span className="text-3xl md:text-4xl mb-4 block">{item.emoji}</span>
                                <h3 className="text-sm md:text-lg font-medium mb-1 md:mb-2">{item.title}</h3>
                                <p className="text-xs md:text-sm text-neutral-500 hidden sm:block">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section className="px-4 md:px-6 py-16 md:py-32 bg-neutral-900/20 border-y border-neutral-900">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10 md:mb-20">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-4 md:mb-6 tracking-tight text-white">Planes simples y claros</h2>
                        <p className="text-neutral-500 text-sm md:text-base">Elige el plan que mejor se adapte a tu volumen de trabajo.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {plans.map((p, i) => {
                            const isHighlight = i === highlightIndex;
                            const isExpanded = expandedPlan === p.id;
                            const visibleFeatures = isExpanded ? p.features : p.features.slice(0, 5);
                            const hasMoreFeatures = p.features.length > 5;
                            return (
                                <motion.div
                                    key={p.id}
                                    whileHover={{ y: -5 }}
                                    className={`rounded-2xl md:rounded-3xl p-5 md:p-8 border transition-all flex flex-col ${isHighlight ? "border-emerald-500/50 bg-neutral-900 shadow-2xl shadow-emerald-500/10" : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"}`}
                                >
                                    {/* Header - altura fija */}
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg md:text-xl font-light">{p.displayName}</h3>
                                        {isHighlight && <span className="bg-emerald-500/10 text-emerald-400 text-[8px] md:text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">Recomendado</span>}
                                    </div>

                                    {/* Descripción - altura fija con line-clamp */}
                                    <p className="text-neutral-500 text-xs md:text-sm mb-4 h-10 line-clamp-2">{p.description}</p>

                                    {/* Precio - siempre a la misma altura */}
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-2xl md:text-4xl font-light text-white">
                                            {p.currency === "USD" ? "$" : p.currency}{p.price}
                                        </span>
                                        {p.price > 0 && <span className="text-neutral-600 text-xs">/ {p.interval === "month" ? "mes" : "año"}</span>}
                                    </div>

                                    {/* Features - expandible */}
                                    <ul className="space-y-2 mb-4 text-xs flex-1">
                                        {visibleFeatures.map((f, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-neutral-300">
                                                <div className="shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5">
                                                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                                                </div>
                                                <span className="leading-tight">{f}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Botón expandir */}
                                    {hasMoreFeatures && (
                                        <button
                                            onClick={() => setExpandedPlan(isExpanded ? null : p.id)}
                                            className="flex items-center justify-center gap-1 text-xs text-neutral-500 hover:text-emerald-400 transition mb-4"
                                        >
                                            {isExpanded ? (
                                                <><ChevronUp className="w-3 h-3" /> Ver menos</>
                                            ) : (
                                                <><ChevronDown className="w-3 h-3" /> +{p.features.length - 5} más</>
                                            )}
                                        </button>
                                    )}

                                    {/* CTA - siempre al fondo */}
                                    <Link href="/dashboard" className="mt-auto">
                                        <button
                                            className={`w-full py-3 rounded-xl font-bold transition text-sm ${isHighlight ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20" : "bg-neutral-800 text-white hover:bg-neutral-700"}`}
                                        >
                                            {getCta(p, i)}
                                        </button>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* COMPARISON TABLE */}
            <section className="px-6 py-24 bg-neutral-950">
                <div className="max-w-4xl mx-auto">
                    <h3 className="text-3xl font-light mb-16 text-center tracking-tight">Compara los planes</h3>
                    <div className="overflow-hidden rounded-3xl border border-neutral-900 bg-neutral-900/10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-neutral-900/50">
                                        <th className="p-6 text-left font-medium text-neutral-400 uppercase tracking-widest text-[10px]">Característica</th>
                                        <th className="p-6 font-medium text-white">Free</th>
                                        <th className="p-6 font-medium text-emerald-400 bg-emerald-500/5">Pro</th>
                                        <th className="p-6 font-medium text-white">Studio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-900">
                                    {[
                                        { name: "Galerías", free: "3", pro: "Ilimitadas", studio: "Ilimitadas" },
                                        { name: "Nubes conectadas", free: "1", pro: "Ilimitadas", studio: "Ilimitadas" },
                                        { name: "Perfil público", free: "—", pro: "✔", studio: "✔" },
                                        { name: "Galerías públicas", free: "—", pro: "✔", studio: "✔" },
                                        { name: "Branding", free: "—", pro: "Básico", studio: "Avanzado" },
                                        { name: "Usuarios", free: "1", pro: "1", studio: "Múltiples" },
                                        { name: "Dominio propio", free: "—", pro: "—", studio: "✔" },
                                        { name: "Analítica", free: "—", pro: "—", studio: "✔" },
                                    ].map((row, i) => (
                                        <tr key={i} className="hover:bg-neutral-900/30 transition-colors">
                                            <td className="p-6 text-neutral-300 font-medium">{row.name}</td>
                                            <td className="p-6 text-center text-neutral-500">{row.free}</td>
                                            <td className="p-6 text-center text-white bg-emerald-500/5">{row.pro}</td>
                                            <td className="p-6 text-center text-neutral-500">{row.studio}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA FINAL */}
            <section className="px-4 md:px-6 py-16 md:py-32 text-center bg-gradient-to-t from-neutral-900/30 to-transparent border-t border-neutral-900">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-6 md:mb-8 tracking-tight">Tu trabajo merece verse bien</h2>
                <p className="text-neutral-500 max-w-xl mx-auto mb-8 md:mb-12 text-sm md:text-lg px-4">
                    Crea tu portafolio profesional en minutos. Sin complicaciones.
                </p>
                <Link href="/dashboard">
                    <button className="px-8 md:px-12 py-4 md:py-5 rounded-full bg-white text-black font-bold hover:scale-105 transition shadow-2xl shadow-white/10 text-sm md:text-base">
                        <span className="hidden sm:inline">Crear mi portafolio gratis</span>
                        <span className="sm:hidden">Empezar gratis</span>
                    </button>
                </Link>
            </section>

            <footer className="px-4 md:px-6 py-8 md:py-10 border-t border-neutral-900 text-center">
                <div className="text-base md:text-lg font-light mb-3 md:mb-4">CloserLens</div>
                <div className="text-xs md:text-sm text-neutral-600 mb-4 md:mb-6 italic">Tu presencia visual profesional.</div>
                <div className="text-[10px] md:text-xs text-neutral-700">© 2026 CloserLens · Hecho para creativos.</div>
            </footer>
        </div>
    );
}
