"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Folder, Loader2, AlertCircle, ArrowLeft, PlusCircle, Check, Mail, Zap, Info, Cloud, ChevronRight } from "lucide-react";
import FolderBrowser from "@/components/FolderBrowser";
import Link from "next/link";

interface CloudAccount {
    id: string;
    email: string | null;
    provider: string;
    name: string | null;
}

export default function NewProjectPage() {
    const router = useRouter();
    const [step, setStep] = useState<"account" | "folder" | "saving">("account");
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [showBrowser, setShowBrowser] = useState(false);

    // Data to save
    const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(null);

    useEffect(() => {
        fetch("/api/cloud/accounts")
            .then((res) => res.json())
            .then((data) => {
                // The API returns the array directly
                const cloudAccounts = Array.isArray(data) ? data : (data.accounts || []);
                setAccounts(cloudAccounts);
                if (cloudAccounts.length > 0) {
                    setSelectedAccount(cloudAccounts[0]);
                }
                setLoadingAccounts(false);
            })
            .catch((err) => {
                console.error(err);
                setLoadingAccounts(false);
            });
    }, []);

    const handleCreateProject = async (folder: { id: string; name: string }) => {
        if (!selectedAccount) return;

        setStep("saving");
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: folder.name,
                    cloudAccountId: selectedAccount.id,
                    rootFolderId: folder.id
                })
            });

            if (!res.ok) throw new Error("Failed to create project");

            // Redirect to dashboard
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
            alert("Error al crear el proyecto");
            setStep("folder");
        }
    };

    if (loadingAccounts) {
        return (
            <div className="flex h-full items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-white mb-8 transition text-sm">
                <ArrowLeft className="w-4 h-4" /> Volver al dashboard
            </Link>

            <h1 className="text-3xl font-light mb-2">Nueva Galería</h1>
            <p className="text-neutral-400 mb-10 text-sm">Configura el origen de tus fotos para la nueva galería.</p>

            {/* Step 1: Account Selection */}
            {step === "account" && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold">1</div>
                        <h2 className="text-xl font-medium">Elige una cuenta de Drive</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {accounts.map((account) => (
                            <button
                                key={account.id}
                                onClick={() => setSelectedAccount(account)}
                                className={`flex items-center justify-between p-6 rounded-2xl border transition-all group shadow-2xl ${selectedAccount?.id === account.id
                                    ? "bg-neutral-800 border-emerald-500/50 shadow-emerald-500/10"
                                    : "bg-neutral-900 border-neutral-700/50 hover:bg-neutral-800 hover:border-neutral-600"
                                    }`}
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-3 rounded-xl transition-all ${selectedAccount?.id === account.id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700"}`}>
                                        <Cloud className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-medium text-lg leading-tight ${selectedAccount?.id === account.id ? "text-white" : "text-neutral-200"}`}>
                                            {account.name || (account.email ? `Drive (${account.email})` : "Cuenta sin nombre")}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em]">{account.provider}</span>
                                            {account.email && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                                                    <span className="text-[10px] font-medium text-neutral-600">{account.email}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {selectedAccount?.id === account.id ? (
                                    <Check className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full border border-neutral-800 group-hover:border-neutral-700 transition-colors" />
                                )}
                            </button>
                        ))}

                        <a
                            href="/api/connect/google"
                            className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-neutral-700/50 bg-neutral-900/40 hover:bg-neutral-900 hover:border-emerald-500/40 transition-all text-neutral-400 hover:text-white group"
                        >
                            <div className="p-2.5 rounded-xl bg-neutral-800 group-hover:bg-neutral-700 text-neutral-500 group-hover:text-emerald-400 transition">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            <div className="text-left font-medium">
                                Conectar otra cuenta de Google Drive
                            </div>
                        </a>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={() => setStep("folder")}
                            disabled={!selectedAccount}
                            className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-bold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-30 flex items-center justify-center gap-2"
                        >
                            Continuar al navegador de archivos <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Folder Selection / Saving */}
            {step !== "account" && selectedAccount && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                    <div className="flex items-center gap-4 mb-8 border-b border-neutral-800 pb-6">
                        <div className="w-10 h-10 bg-emerald-900/20 text-emerald-400 rounded-full flex items-center justify-center text-lg font-bold">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500">Nube activa</p>
                            <p className="font-medium text-emerald-400">
                                {selectedAccount.name || selectedAccount.email || "Cuenta conectada"}
                            </p>
                        </div>
                        <button
                            onClick={() => setStep("account")}
                            className="ml-auto text-xs font-medium text-neutral-500 hover:text-white underline underline-offset-4"
                        >
                            Cambiar cuenta
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold">2</div>
                        <div>
                            <p className="text-sm text-neutral-500">Origen de fotos</p>
                            <h3 className="text-lg font-medium">Selecciona una carpeta</h3>
                        </div>
                    </div>

                    <div className="pl-14">
                        <p className="text-neutral-400 mb-6 text-sm">
                            Elige la carpeta de Drive con tus fotos. El nombre de la carpeta se usará como título para la galería.
                        </p>

                        {/* Pro Tip: Folder Structure */}
                        <div className="mb-8 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4 text-blue-400">
                                <Zap className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Tip Profesional: Estructura de Proxies</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                        <Folder className="w-3.5 h-3.5 text-blue-400" /> /webjpg
                                    </div>
                                    <p className="text-[10px] text-neutral-500 italic">Previsualización rápida</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                        <Folder className="w-3.5 h-3.5 text-emerald-400" /> /jpg
                                    </div>
                                    <p className="text-[10px] text-neutral-500 italic">Descargas alta res</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
                                        <Folder className="w-3.5 h-3.5 text-orange-400" /> /raw
                                    </div>
                                    <p className="text-[10px] text-neutral-500 italic">Archivos originales</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-blue-500/10 flex gap-3 text-[11px] text-neutral-400 leading-relaxed">
                                <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                <span>Asegúrate de que los archivos tengan el <b>mismo nombre</b> en todas las carpetas. TuSet los vincula automáticamente.</span>
                            </div>
                        </div>

                        {step === "saving" ? (
                            <div className="flex items-center gap-3 text-emerald-500 bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-2xl">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-medium">Creando galería profesional...</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowBrowser(true)}
                                className="w-full py-8 border-2 border-dashed border-neutral-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all text-neutral-400 hover:text-emerald-400 group"
                            >
                                <div className="p-3 bg-neutral-800 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                    <Folder className="w-6 h-6" />
                                </div>
                                <span className="font-medium">Explorar mi Google Drive</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Folder Browser Modal */}
            {showBrowser && selectedAccount && (
                <FolderBrowser
                    cloudAccountId={selectedAccount.id}
                    onSelect={(folder) => {
                        setShowBrowser(false);
                        handleCreateProject(folder);
                    }}
                    onCancel={() => setShowBrowser(false)}
                />
            )}
        </div>
    );
}
