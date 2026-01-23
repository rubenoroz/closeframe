"use client";

import React from "react";
import { CreditCard, User, BarChart3, FileText, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

export default function BillingPage() {
    const { data: session } = useSession();

    // User data from session
    const userName = session?.user?.name || "Usuario Planificador";
    const userEmail = session?.user?.email || "correo@ejemplo.com";

    const handleOpenPortal = async () => {
        try {
            const response = await fetch("/api/stripe/portal", {
                method: "POST",
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("No se pudo acceder al portal de pagos.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al conectar con Stripe.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-900 pb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-light mb-4 text-white">Cuenta y pagos</h1>
                    <p className="text-neutral-500 text-sm italic">Gestiona tu suscripción, perfil y detalles de facturación.</p>
                </div>
            </header>

            <main className="space-y-14">
                {/* ACCOUNT INFO */}
                <section>
                    <div className="flex items-center gap-3 mb-6 text-neutral-400 font-medium uppercase tracking-widest text-[10px]">
                        <User className="w-5 h-5 text-emerald-500" /> Información de la cuenta
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <motion.div
                            whileHover={{ y: -2 }}
                            className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40"
                        >
                            <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Nombre</p>
                            <p className="text-white font-medium">{userName}</p>
                        </motion.div>
                        <motion.div
                            whileHover={{ y: -2 }}
                            className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40"
                        >
                            <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Correo</p>
                            <p className="text-white font-medium">{userEmail}</p>
                        </motion.div>
                        <motion.div
                            whileHover={{ y: -2 }}
                            className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40"
                        >
                            <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Estado</p>
                            <p className="text-emerald-400 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Cuenta activa
                            </p>
                        </motion.div>
                        <motion.div
                            whileHover={{ y: -2 }}
                            className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40"
                        >
                            <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Miembro desde</p>
                            <p className="text-white font-medium">Enero 2026</p>
                        </motion.div>
                    </div>
                </section>

                {/* PLAN */}
                <section>
                    <div className="flex items-center gap-3 mb-6 text-neutral-400 font-medium uppercase tracking-widest text-[10px]">
                        <CreditCard className="w-5 h-5 text-emerald-500" /> Plan actual
                    </div>

                    <div className="p-8 rounded-3xl border border-neutral-800 bg-neutral-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl shadow-black/50 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />

                        <div className="relative z-10">
                            <h3 className="text-2xl font-light text-white">Plan Actual</h3>
                            <p className="text-sm text-neutral-400 mt-2 max-w-md">
                                Gestiona tu acceso a galerías ilimitadas y funciones exclusivas.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.href = "/pricing"}
                            className="relative z-10 px-8 py-3 rounded-full border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 transition text-sm font-medium"
                        >
                            Ver planes
                        </button>
                    </div>
                </section>

                {/* USAGE */}
                <section>
                    <div className="flex items-center gap-3 mb-6 text-neutral-400 font-medium uppercase tracking-widest text-[10px]">
                        <BarChart3 className="w-5 h-5 text-emerald-500" /> Uso actual
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
                            <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Galerías</p>
                            <p className="text-white text-xl font-light">-- / <span className="opacity-30">--</span></p>
                        </div>
                        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
                            <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Nubes conectadas</p>
                            <p className="text-white text-xl font-light">-- / <span className="opacity-30">--</span></p>
                        </div>
                        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
                            <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Visitas del mes</p>
                            <p className="text-white text-xl font-light">--</p>
                        </div>
                    </div>
                </section>

                {/* BILLING */}
                <section>
                    <div className="flex items-center gap-3 mb-6 text-neutral-400 font-medium uppercase tracking-widest text-[10px]">
                        <FileText className="w-5 h-5 text-emerald-500" /> Pagos y facturación
                    </div>

                    <div className="p-8 rounded-3xl border border-neutral-800 bg-neutral-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-b-neutral-800">
                        <p className="text-neutral-400 text-sm">Gestiona tus tarjetas, historial de pagos y facturas oficiales a través de nuestro portal seguro con Stripe.</p>
                        <button
                            onClick={handleOpenPortal}
                            className="px-8 py-3 rounded-full bg-white text-black hover:bg-neutral-200 transition text-sm font-bold shrink-0"
                        >
                            Abrir portal de pagos
                        </button>
                    </div>
                </section>

                {/* CANCEL */}
                <section className="pt-8 border-t border-neutral-900">
                    <div className="flex items-center gap-3 mb-6 text-red-500/80 font-medium uppercase tracking-widest text-[10px]">
                        <AlertTriangle className="w-4 h-4" /> Zona de peligro
                    </div>

                    <div className="p-8 rounded-3xl border border-red-900/20 bg-red-950/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h4 className="text-red-400 font-medium mb-1">Cancelar suscripción</h4>
                            <p className="text-xs text-neutral-500 max-w-md">
                                Al cancelar, tus galerías existentes seguirán activas pero no podrás crear nuevas ni conectar más nubes.
                            </p>
                        </div>
                        <button
                            onClick={handleOpenPortal}
                            className="px-6 py-2.5 rounded-full border border-red-900/30 text-red-400/60 hover:text-red-400 hover:border-red-500 hover:bg-red-500/5 transition text-xs font-bold shrink-0"
                        >
                            Gestionar en Portal
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}
