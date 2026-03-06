"use client";

import React, { useEffect } from "react";
import { CreditCard, User, BarChart3, FileText, AlertTriangle, Trash2, Loader2, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { ReferralsContent } from "@/components/dashboard/ReferralsContent";

interface BillingClientProps {
    userName: string;
    userEmail: string;
    projectsCount: number;
    cloudsCount: number;
    profileViews: number;
    planName: string;
}

export default function BillingClient({
    userName,
    userEmail,
    projectsCount,
    cloudsCount,
    profileViews,
    planName
}: BillingClientProps) {

    const [activeTab, setActiveTab] = React.useState<"plan" | "referrals">("plan");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("tab") === "referrals") {
            setActiveTab("referrals");
        }
    }, []);

    const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "ELIMINAR") return;

        setIsDeletingAccount(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("Failed to delete account");
            }

            // Redirect to confirmation page and sign out
            await signOut({ callbackUrl: "/account-deleted" });
        } catch (err: any) {
            console.error(err);
            alert("Hubo un error al intentar eliminar tu cuenta.");
            setIsDeletingAccount(false);
        }
    };

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
                    <h1 className="text-3xl md:text-4xl font-light mb-4 text-white">Suscripción</h1>
                    <p className="text-neutral-500 text-sm italic">Gestiona tu plan, límites y recompensas.</p>
                </div>

                {/* Tabs Toggle */}
                <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    <button
                        onClick={() => setActiveTab("plan")}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "plan" ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}
                    >
                        Mi Plan
                    </button>
                    <button
                        onClick={() => setActiveTab("referrals")}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "referrals" ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}
                    >
                        Referidos
                    </button>
                </div>
            </header>

            <main className="space-y-14">
                {activeTab === "plan" ? (
                    <>
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
                                        Activo
                                    </p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40"
                                >
                                    <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Plan</p>
                                    <p className="text-white font-medium capitalize">{planName}</p>
                                </motion.div>
                            </div>
                        </section>

                        {/* PLAN */}
                        <section>
                            <div className="flex items-center gap-3 mb-6 text-neutral-400 font-medium uppercase tracking-widest text-[10px]">
                                <CreditCard className="w-5 h-5 text-emerald-500" /> Tu Plan
                            </div>

                            <div className="p-8 rounded-3xl border border-neutral-800 bg-neutral-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl shadow-black/50 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />

                                <div className="relative z-10">
                                    <h3 className="text-2xl font-light text-white capitalize">{planName}</h3>
                                    <p className="text-sm text-neutral-400 mt-2 max-w-md">
                                        {planName === 'pro'
                                            ? "Tienes acceso a todas las funciones profesionales."
                                            : "Actualiza a PRO para desbloquear todo el potencial."}
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
                                    <p className="text-white text-xl font-light">{projectsCount}</p>
                                </div>
                                <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
                                    <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Nubes conectadas</p>
                                    <p className="text-white text-xl font-light">{cloudsCount}</p>
                                </div>
                                <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
                                    <p className="text-[10px] uppercase font-bold text-neutral-600 mb-1">Visitas Perfil</p>
                                    <p className="text-white text-xl font-light">{profileViews}</p>
                                </div>
                            </div>
                        </section>

                        {/* BILLING */}
                        <section>
                            <div className="flex items-center gap-3 mb-6 text-neutral-400 font-medium uppercase tracking-widest text-[10px]">
                                <FileText className="w-5 h-5 text-emerald-500" /> Facturación
                            </div>

                            <div className="p-8 rounded-3xl border border-neutral-800 bg-neutral-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-b-neutral-800">
                                <p className="text-neutral-400 text-sm">Gestiona tus tarjetas, historial de pagos y facturas oficiales.</p>
                                <button
                                    onClick={handleOpenPortal}
                                    className="px-8 py-3 rounded-full bg-white text-black hover:bg-neutral-200 transition text-sm font-bold shrink-0"
                                >
                                    Abrir portal de pagos
                                </button>
                            </div>
                        </section>

                        {/* CANCEL & DELETE */}
                        <section className="pt-8 border-t border-neutral-900 space-y-4">
                            <div className="flex items-center gap-3 mb-6 text-red-500/80 font-medium uppercase tracking-widest text-[10px]">
                                <AlertTriangle className="w-4 h-4" /> Zona de peligro
                            </div>

                            <div className="grid gap-4">
                                <div className="p-8 rounded-3xl border border-red-900/20 bg-red-950/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div>
                                        <h4 className="text-red-400 font-medium mb-1 text-sm md:text-base">Cancelar suscripción</h4>
                                        <p className="text-xs text-neutral-500 max-w-md">
                                            Gestiona la cancelación o pausa de tu suscripción directamente en el portal de Stripe.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOpenPortal}
                                        className="px-6 py-2.5 rounded-full border border-red-900/30 text-red-400/60 hover:text-red-400 hover:border-red-500 hover:bg-red-500/5 transition text-xs font-bold shrink-0"
                                    >
                                        Gestionar en Portal
                                    </button>
                                </div>

                                <div className="p-8 rounded-3xl border border-red-900/20 bg-red-950/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-red-500/5 shadow-inner">
                                    <div>
                                        <h4 className="text-red-500 font-medium mb-1 text-sm md:text-base">Eliminar cuenta</h4>
                                        <p className="text-xs text-neutral-500 max-w-md">
                                            Borra permanentemente tu cuenta y todos tus datos (proyectos, configuraciones, etc.). Esta acción no se puede deshacer.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-6 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all text-xs font-bold shrink-0"
                                    >
                                        Eliminar definitivamente
                                    </button>
                                </div>
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="pb-12">
                        <ReferralsContent />
                    </div>
                )}
            </main>

            {/* CONFIRM DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative max-w-md w-full rounded-2xl p-8 border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden"
                    >
                        <div className="space-y-6">
                            <div className="bg-red-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-medium text-white">¿Estás absolutamente seguro?</h3>
                                <p className="text-sm text-neutral-500">
                                    Esta acción eliminará permanentemente tu cuenta y todos tus datos de nuestros servidores.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 block text-center text-neutral-400">
                                    Escribe <span className="text-red-500">ELIMINAR</span> para confirmar
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="ELIMINAR"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-center font-bold tracking-widest uppercase transition-all bg-black/50 border border-neutral-800 focus:border-red-500/50 text-white"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-xs transition-all bg-neutral-800 text-neutral-400"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmText !== "ELIMINAR" || isDeletingAccount}
                                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${deleteConfirmText === "ELIMINAR" && !isDeletingAccount
                                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                        : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                                        }`}
                                >
                                    {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar cuenta"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
