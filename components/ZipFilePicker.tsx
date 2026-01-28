"use client";

import React, { useEffect, useState } from "react";
import { Loader2, FileArchive, Check } from "lucide-react";

interface ZipFile {
    id: string;
    name: string;
    mimeType?: string;
    size?: number;
}

interface ZipFilePickerProps {
    cloudAccountId: string;
    folderId: string;
    onSelect: (fileId: string, fileName: string) => void;
    onCancel: () => void;
    selectedFileId?: string | null;
}

export default function ZipFilePicker({
    cloudAccountId,
    folderId,
    onSelect,
    onCancel,
    selectedFileId
}: ZipFilePickerProps) {
    const [files, setFiles] = useState<ZipFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!cloudAccountId || !folderId) return;

        setLoading(true);
        fetch(`/api/cloud/files?cloudAccountId=${cloudAccountId}&folderId=${folderId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.files) {
                    // Filter for ZIP files only
                    const zipFiles = data.files.filter((f: ZipFile) =>
                        f.mimeType?.includes('zip') ||
                        f.name?.toLowerCase().endsWith('.zip')
                    );
                    setFiles(zipFiles);
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

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const mb = bytes / (1024 * 1024);
        return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-white">Seleccionar archivo ZIP</h3>
                        <p className="text-neutral-400 text-sm">Elige un archivo .zip de la carpeta del proyecto</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                    >
                        Esc
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p>Buscando archivos ZIP...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center text-red-400">
                            {error}
                        </div>
                    ) : files.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-500 py-8">
                            <FileArchive className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-center">No se encontraron archivos ZIP en esta carpeta.</p>
                            <p className="text-xs text-neutral-600 mt-2">Sube un archivo .zip a Google Drive y vuelve a intentar.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => onSelect(file.id, file.name)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedFileId === file.id
                                            ? "bg-blue-500/20 border border-blue-500"
                                            : "bg-neutral-800/50 border border-transparent hover:bg-neutral-800 hover:border-neutral-700"
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${selectedFileId === file.id ? 'bg-blue-500' : 'bg-neutral-700'}`}>
                                        <FileArchive className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{file.name}</p>
                                        {file.size && (
                                            <p className="text-xs text-neutral-500">{formatSize(file.size)}</p>
                                        )}
                                    </div>
                                    {selectedFileId === file.id && (
                                        <div className="bg-blue-500 text-white p-1 rounded-full">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
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
