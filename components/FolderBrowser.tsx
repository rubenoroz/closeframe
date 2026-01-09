"use client";

import React, { useState, useEffect } from "react";
import { Folder, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloudFolder {
    id: string;
    name: string;
}

interface Props {
    cloudAccountId: string;
    onSelect: (folder: CloudFolder) => void;
    onCancel: () => void;
}

export default function FolderBrowser({ cloudAccountId, onSelect, onCancel }: Props) {
    const [folders, setFolders] = useState<CloudFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<{ id: string; name: string }[]>([
        { id: "root", name: "Inicio" },
    ]);

    const currentFolder = history[history.length - 1];

    const fetchFolders = async (folderId: string) => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/cloud/folders?cloudAccountId=${cloudAccountId}&folderId=${folderId}`
            );
            const data = await res.json();
            if (data.folders) {
                setFolders(data.folders);
            } else {
                console.error(data.error);
                alert(`Error al listar carpetas:\n\n${data.details || data.error}\n\nTIP: ¿Habilitaste "Google Drive API" en tu proyecto de Google Cloud?`);
            }
        } catch (err) {
            console.error("Error fetching folders:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFolders(currentFolder.id);
    }, [currentFolder]);

    const handleNavigate = (folder: CloudFolder) => {
        setHistory((prev) => [...prev, folder]);
    };

    const handleBack = () => {
        if (history.length > 1) {
            setHistory((prev) => prev.slice(0, -1));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
                    <div className="flex items-center gap-2">
                        {history.length > 1 && (
                            <button
                                onClick={handleBack}
                                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h2 className="text-lg font-medium text-neutral-200">
                            {currentFolder.name}
                        </h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-sm text-neutral-500 hover:text-white transition"
                    >
                        Cancelar
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <p className="text-sm">Escaneando directorios...</p>
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                            <Folder className="w-12 h-12 mb-2 opacity-20" />
                            <p>No se encontraron carpetas aqui</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {folders.map((folder) => (
                                <div
                                    key={folder.id}
                                    className="group flex items-center justify-between p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 cursor-pointer transition-all shadow-sm"
                                    onClick={() => handleNavigate(folder)}
                                >
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="p-2 bg-sky-500/10 rounded-lg group-hover:bg-sky-500/20 transition">
                                            <Folder className="w-5 h-5 text-sky-500 fill-sky-500/20" />
                                        </div>
                                        <span className="text-sm font-medium text-neutral-200 truncate">
                                            {folder.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(folder);
                                            }}
                                            className="px-4 py-2 text-xs font-bold bg-white text-black rounded-lg hover:bg-emerald-500 hover:text-white transition-colors shadow-lg"
                                        >
                                            Seleccionar
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-neutral-800 bg-neutral-900/50 text-xs text-neutral-500 text-center">
                    Navega y selecciona la carpeta que contiene las fotos
                </div>
            </div>
        </div>
    );
}
