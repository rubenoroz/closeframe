"use client";

import { motion } from "framer-motion";
import { Cloud, Camera, Zap, ShieldCheck, Check } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
    const plans = [
        {
            name: "Free",
            price: "$0",
            desc: "Para probar Closeframe",
            features: [
                "Hasta 3 galerías",
                "1 nube conectada (Google Drive)",
                "Galerías privadas",
                "Fotos y video",
            ],
            cta: "Empezar gratis",
            highlight: false,
        },
        {
            name: "Pro",
            price: "$15 / mes",
            desc: "Para fotógrafos profesionales",
            features: [
                "Galerías ilimitadas",
                "Múltiples nubes",
                "Perfil público",
                "Galerías públicas",
                "Favoritos y descargas",
                "Branding básico",
            ],
            cta: "Elegir Pro",
            highlight: true,
        },
        {
            name: "Studio",
            price: "$35 / mes",
            desc: "Para estudios y equipos",
            features: [
                "Todo en Pro",
                "Usuarios múltiples",
                "Branding avanzado",
                "Dominio personalizado",
                "Analítica",
                "Soporte prioritario",
            ],
            cta: "Hablar con ventas",
            highlight: false,
        },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            {/* TOP NAV */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur border-b border-neutral-800">
                <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                    <span className="text-lg md:text-xl font-light tracking-tight">Closeframe</span>
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
                        Entrega galerías profesionales<br />
                        <span className="text-neutral-500">sin subir archivos</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-neutral-400 max-w-2xl mx-auto mb-8 md:mb-12 text-sm md:text-lg px-4"
                    >
                        Closeframe transforma tus carpetas de Google Drive en galerías elegantes para tus clientes. Mantén tus archivos donde ya están.
                    </motion.p>
                    <Link href="/dashboard">
                        <button className="px-8 md:px-10 py-3 md:py-4 rounded-full bg-white text-black font-bold hover:scale-105 transition shadow-xl shadow-white/10 text-sm md:text-base">
                            Crear cuenta gratis
                        </button>
                    </Link>
                </div>
            </section>

            {/* FEATURES */}
            <section className="px-4 md:px-6 py-16 md:py-24 max-w-6xl mx-auto relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    {[
                        {
                            icon: <Cloud className="w-5 h-5 md:w-6 md:h-6 text-sky-400" />,
                            title: "Usa tu nube",
                            desc: "Tus archivos siguen viviendo en Drive.",
                        },
                        {
                            icon: <Camera className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />,
                            title: "Galerías premium",
                            desc: "Diseño limpio tipo Pixieset.",
                        },
                        {
                            icon: <Zap className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />,
                            title: "Rápido",
                            desc: "Thumbnails y carga inmediata.",
                        },
                        {
                            icon: <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />,
                            title: "Seguro",
                            desc: "Acceso privado por galería.",
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

            {/* PRICING */}
            <section className="px-4 md:px-6 py-16 md:py-32 bg-neutral-900/20 border-y border-neutral-900">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10 md:mb-20">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-4 md:mb-6 tracking-tight text-white">Planes simples y claros</h2>
                        <p className="text-neutral-500 text-sm md:text-base">Elige el plan que mejor se adapte a tu volumen de trabajo.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                        {plans.map((p, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -10 }}
                                className={`rounded-2xl md:rounded-3xl p-6 md:p-10 border transition-all ${p.highlight ? "border-emerald-500/50 bg-neutral-900 shadow-2xl shadow-emerald-500/10" : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"}`}
                            >
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <h3 className="text-xl md:text-2xl font-light">{p.name}</h3>
                                    {p.highlight && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2 md:px-3 py-1 rounded-full">Recomendado</span>}
                                </div>
                                <p className="text-neutral-500 text-xs md:text-sm mb-4 md:mb-8">{p.desc}</p>
                                <div className="flex items-baseline gap-1 mb-4 md:mb-8">
                                    <span className="text-3xl md:text-5xl font-light text-white">{p.price.split(' ')[0]}</span>
                                    {p.price.includes('/') && <span className="text-neutral-600 text-xs md:text-sm">/ mes</span>}
                                </div>
                                <ul className="space-y-2 md:space-y-4 mb-6 md:mb-10 text-xs md:text-sm">
                                    {p.features.map((f, idx) => (
                                        <li key={idx} className="flex items-center gap-2 md:gap-3 text-neutral-300">
                                            <div className="shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-500" />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/dashboard">
                                    <button
                                        className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold transition text-sm md:text-base ${p.highlight ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20" : "bg-neutral-800 text-white hover:bg-neutral-700"}`}
                                    >
                                        {p.cta}
                                    </button>
                                </Link>
                            </motion.div>
                        ))}
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
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-6 md:mb-8 tracking-tight">Empieza hoy mismo</h2>
                <p className="text-neutral-500 max-w-xl mx-auto mb-8 md:mb-12 text-sm md:text-lg px-4">
                    Crea tu primera galería en minutos usando tu propia nube. Sin instalaciones complicadas.
                </p>
                <Link href="/dashboard">
                    <button className="px-8 md:px-12 py-4 md:py-5 rounded-full bg-white text-black font-bold hover:scale-105 transition shadow-2xl shadow-white/10 text-sm md:text-base">
                        <span className="hidden sm:inline">Crear cuenta gratis ahora</span>
                        <span className="sm:hidden">Empezar gratis</span>
                    </button>
                </Link>
            </section>

            <footer className="px-4 md:px-6 py-8 md:py-10 border-t border-neutral-900 text-center">
                <div className="text-base md:text-lg font-light mb-3 md:mb-4">Closeframe</div>
                <div className="text-xs md:text-sm text-neutral-600 mb-4 md:mb-6 italic">Galerías profesionales sin almacenamiento extra.</div>
                <div className="text-[10px] md:text-xs text-neutral-700">© 2026 Closeframe · Hecho para fotógrafos.</div>
            </footer>
        </div>
    );
}
