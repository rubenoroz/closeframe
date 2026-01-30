"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Image as ImageIcon, Check } from "lucide-react";

interface CloudFile {
    id: string;
    name: string;
    mimeType?: string;
    thumbnailLink?: string;
    width?: number;
    height?: number;
}

interface DriveFilePickerProps {
    cloudAccountId: string;
    folderId: string;
    onSelect: (fileId: string, thumbnail: string) => void;
    onCancel: () => void;
    selectedFileId?: string | null;
}

export default function DriveFilePicker({
    cloudAccountId,
    folderId,
    onSelect,
    onCancel,
    selectedFileId
}: DriveFilePickerProps) {
    const [files, setFiles] = useState<CloudFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!cloudAccountId || !folderId) return;

        setLoading(true);
        fetch(`/api/cloud/files?cloudAccountId=${cloudAccountId}&folderId=${folderId}`, { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (data.files) {
                    console.log("DrivePicker Files:", data.files.length);
                    // Filter for images only
                    const images = data.files.filter((f: CloudFile) => {
                        const isImageMime = f.mimeType?.startsWith("image/");
                        // Fallback: check extension if mime is missing or generic
                        const isImageExt = /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(f.name);
                        return isImageMime || isImageExt;
                    });
                    setFiles(images);
                } else {
                    setError(data.error || "Error al cargar archivos");
                }
                setLoading(false);
            })
            .catch((err) => {
                setError("Error de conexión");
                setLoading(false);
            });
    }, [cloudAccountId, folderId]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onCancel]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={onCancel}
        >
            <div
                className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-white">Seleccionar Portada</h3>
                        <p className="text-neutral-400 text-sm">Elige una imagen de la carpeta del proyecto</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                    >
                        Esc
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <p>Cargando imágenes de Drive...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center text-red-400">
                            {error}
                        </div>
                    ) : files.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                            <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                            <p>No se encontraron imágenes en esta carpeta.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => onSelect(file.id, `/api/cloud/thumbnail?c=${cloudAccountId}&f=${file.id}&s=400`)}
                                    className={`relative aspect-[4/3] group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${selectedFileId === file.id
                                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                                        : "border-transparent hover:border-neutral-700"
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
                                    <img
                                        src={`/api/cloud/thumbnail?c=${cloudAccountId}&f=${file.id}&s=200${file.thumbnailLink ? `&t=${encodeURIComponent(file.thumbnailLink)}` : ""}`}
                                        alt={file.name}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                                    {selectedFileId === file.id && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}

                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white truncate">{file.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
