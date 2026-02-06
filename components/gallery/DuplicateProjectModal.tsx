"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Loader2, Folder, AlertCircle } from "lucide-react";
import FolderBrowser from "@/components/FolderBrowser";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DuplicateProjectModalProps {
    project: {
        id: string;
        name: string;
        cloudAccountId: string;
    };
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    isLight?: boolean;
}

export default function DuplicateProjectModal({
    project,
    isOpen,
    onClose,
    onSuccess,
    isLight = false
}: DuplicateProjectModalProps) {
    const router = useRouter();
    const [newName, setNewName] = useState(`Copia de ${project.name}`);
    const [newRootFolderId, setNewRootFolderId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const handleDuplicate = async () => {
        if (!newName.trim() || !newRootFolderId) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/projects/${project.id}/duplicate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    newName: newName.trim(),
                    newRootFolderId
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al duplicar galería");
            }

            toast.success("Galería duplicada correctamente");
            onSuccess?.();
            onClose();
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${isLight ? "bg-white border-neutral-200" : "bg-neutral-900 border-neutral-800"
                            }`}
                    >
                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? "border-neutral-100" : "border-neutral-800"
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isLight ? "bg-neutral-100 text-neutral-600" : "bg-neutral-800 text-neutral-400"}`}>
                                    <Copy className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className={`text-lg font-semibold ${isLight ? "text-neutral-900" : "text-white"}`}>
                                        Duplicar Galería
                                    </h2>
                                    <p className={`text-xs ${isLight ? "text-neutral-500" : "text-neutral-500"}`}>
                                        Crea una copia con los mismos ajustes
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className={`p-2 rounded-full transition-colors ${isLight ? "hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600" : "hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300"
                                    }`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">

                            {/* Alert Info */}
                            <div className={`p-4 rounded-xl flex gap-3 text-sm ${isLight ? "bg-blue-50 text-blue-700" : "bg-blue-500/10 text-blue-200"
                                }`}>
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>
                                    Se copiarán todos los ajustes de diseño (colores, fuentes, accesos) pero usarás una <strong>nueva carpeta de fotos</strong>.
                                </p>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? "text-neutral-500" : "text-neutral-500"
                                    }`}>
                                    Nombre de la Nueva Galería
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isLight
                                        ? "bg-neutral-50 border-neutral-200 focus:border-neutral-400 text-neutral-900"
                                        : "bg-neutral-800 border-neutral-700 focus:border-neutral-600 text-white"
                                        }`}
                                    placeholder="Nombre de la copia..."
                                />
                            </div>

                            {/* Folder Picker */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? "text-neutral-500" : "text-neutral-500"
                                    }`}>
                                    Carpeta de Origen (Drive)
                                </label>

                                {newRootFolderId ? (
                                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20"
                                        }`}>
                                        <div className="p-2 bg-emerald-500 text-white rounded-lg">
                                            <Folder className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isLight ? "text-emerald-900" : "text-emerald-100"}`}>
                                                Carpeta Seleccionada
                                            </p>
                                            <p className={`text-xs truncate ${isLight ? "text-emerald-700" : "text-emerald-300/70"}`}>
                                                ID: {newRootFolderId}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setPickerOpen(true)}
                                            className={`text-xs underline ${isLight ? "text-emerald-700" : "text-emerald-400"}`}
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setPickerOpen(true)}
                                        className={`w-full py-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${isLight
                                            ? "border-neutral-300 hover:border-neutral-400 text-neutral-500"
                                            : "border-neutral-700 hover:border-neutral-600 text-neutral-400"
                                            }`}
                                    >
                                        <Folder className="w-5 h-5" />
                                        <span>Seleccionar Carpeta...</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isLight ? "bg-neutral-50 border-neutral-100" : "bg-neutral-800/50 border-neutral-800"
                            }`}>
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isLight ? "text-neutral-600 hover:bg-neutral-200" : "text-neutral-400 hover:bg-white/5"
                                    }`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDuplicate}
                                disabled={isSubmitting || !newName.trim() || !newRootFolderId}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Duplicar Galería
                            </button>
                        </div>

                        {/* Drive Picker Overlay */}
                        {/* Drive Picker Overlay */}
                        {pickerOpen && (
                            <FolderBrowser
                                cloudAccountId={project.cloudAccountId}
                                onSelect={(folder) => {
                                    setNewRootFolderId(folder.id);
                                    setPickerOpen(false);
                                }}
                                onCancel={() => setPickerOpen(false)}
                            />
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
