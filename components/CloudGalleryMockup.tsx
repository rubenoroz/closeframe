"use client";

import React, { useEffect, useState } from "react";
import { Folder, UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import FolderBrowser from "./FolderBrowser";
import GalleryViewer from "@/components/gallery/GalleryViewer";
import { Camera } from "lucide-react";

interface Props {
    googleConfigured: boolean;
}

interface CloudAccount {
    id: string;
    email: string;
    provider: string;
}

export default function CloudGalleryMockup({ googleConfigured }: Props) {
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showBrowser, setShowBrowser] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        fetch("/api/cloud/accounts")
            .then((res) => {
                if (!res.ok) throw new Error("Error connecting to server");
                return res.json();
            })
            .then((data) => {
                if (data.accounts) setAccounts(data.accounts);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError("Error cargando configuración.");
                setLoading(false);
            });
    }, []);

    const handleFolderSelect = (folder: { id: string; name: string }) => {
        setSelectedFolder(folder);
        setShowBrowser(false);
    };

    // ------------------------------------------------------------------
    // MODE: PREVIEW (GalleryViewer)
    // ------------------------------------------------------------------
    if (selectedFolder && accounts[0]) {
        return (
            <div className="relative">
                <GalleryViewer
                    cloudAccountId={accounts[0].id}
                    folderId={selectedFolder.id}
                    projectName={selectedFolder.name}
                />
                {/* Control to exit preview */}
                <div className="fixed bottom-4 left-4 z-50">
                    <button
                        onClick={() => setSelectedFolder(null)}
                        className="px-4 py-2 bg-black/80 hover:bg-black text-white text-xs rounded-full border border-neutral-700 backdrop-blur transition hover:scale-105"
                    >
                        ← Volver al Editor
                    </button>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // MODE: BUILDER / ADMIN (Select Folder)
    // ------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans relative flex items-center justify-center">

            {/* Small Header for Context */}
            <div className="absolute top-0 left-0 p-6 flex items-center gap-2 opacity-50">
                <Camera className="w-5 h-5" />
                <span className="text-sm font-light">Closerlens / Demo Mode</span>
            </div>

            {/* Folder Browser Modal */}
            {showBrowser && accounts.length > 0 && (
                <FolderBrowser
                    cloudAccountId={accounts[0].id}
                    onSelect={handleFolderSelect}
                    onCancel={() => setShowBrowser(false)}
                />
            )}

            {/* Connection / Setup UI in Center */}
            <div className="p-10 border border-neutral-800 rounded-2xl bg-neutral-900/50 flex flex-col items-center justify-center text-center max-w-lg shadow-2xl w-full mx-4">
                <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6 text-emerald-500 shadow-inner">
                    <UploadCloud className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-light mb-2">Constructor de Galerías</h2>
                <p className="text-neutral-400 mb-8 leading-relaxed max-w-sm mx-auto">
                    Conecta tu nube para previsualizar cómo se verían tus carpetas en Closerlens.
                </p>

                {error && (
                    <div className="flex flex-col items-center gap-2 mb-6 w-full">
                        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg text-sm w-full justify-center">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center gap-2 text-neutral-500 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando estado...
                    </div>
                ) : accounts.length > 0 ? (
                    <div className="flex flex-col gap-4 w-full">
                        <button
                            onClick={() => setShowBrowser(true)}
                            className="w-full px-6 py-4 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition flex items-center justify-center gap-2"
                        >
                            <Folder className="w-5 h-5" />
                            Seleccionar Carpeta
                        </button>

                        <div className="flex items-center gap-2 justify-center mt-2">
                            <span className="text-xs text-neutral-500">Cuenta: {accounts[0].email}</span>
                            <a
                                href="/api/connect/google"
                                className="text-xs text-sky-400 underline hover:text-sky-300"
                            >
                                Cambiar
                            </a>
                        </div>
                    </div>
                ) : googleConfigured ? (
                    <a
                        href="/api/connect/google"
                        className="w-full px-6 py-4 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition flex items-center justify-center gap-2"
                    >
                        <UploadCloud className="w-5 h-5" />
                        Conectar Google Drive
                    </a>
                ) : (
                    <div className="text-sm text-yellow-500 bg-yellow-900/20 px-6 py-3 rounded-lg">
                        ⚠️ Configura GOOGLE_CLIENT_ID en tu archivo .env
                    </div>
                )}
            </div>
        </div>
    );
}
