'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Upload,
    Check,
    AlertCircle,
    Loader2,
    Image as ImageIcon,
    X,
    Trash2,
    FileUp,
    Images
} from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface FileWithStatus {
    file: File;
    id: string;
    preview: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}

interface MassiveUploadClientProps {
    token: string;
}

export default function MassiveUploadClient({ token }: MassiveUploadClientProps) {
    const [files, setFiles] = useState<FileWithStatus[]>([]);
    const [state, setState] = useState<UploadState>('idle');
    const [globalProgress, setGlobalProgress] = useState(0);
    const [deviceId] = useState(() => getOrCreateDeviceId());
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const compressImage = async (file: File): Promise<File> => {
        if (!file.type.startsWith('image/')) return file;

        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                let width = img.width;
                let height = img.height;
                const maxDim = 2048;

                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', 0.82); // Slightly higher quality than default simple version
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            img.src = url;
        });
    };

    const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const newFiles: FileWithStatus[] = Array.from(selectedFiles).map(file => ({
            file,
            id: Math.random().toString(36).substring(7) + Date.now(),
            preview: URL.createObjectURL(file), // Important: revoke this later
            status: 'pending',
            progress: 0
        }));

        setFiles(prev => [...prev, ...newFiles]);
        if (state === 'success' || state === 'error') setState('idle');
    }, [state]);

    const removeFile = (id: string) => {
        setFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
            return prev.filter(f => f.id !== id);
        });
    };

    const startUpload = async () => {
        if (files.length === 0) return;

        setState('uploading');
        let completed = 0;
        const total = files.length;

        for (const fileItem of files) {
            if (fileItem.status === 'success') {
                completed++;
                continue;
            }

            setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' } : f));

            try {
                const processedFile = await compressImage(fileItem.file);
                const formData = new FormData();
                formData.append('file', processedFile);

                const res = await fetch(`/api/upload/${token}`, {
                    method: 'POST',
                    headers: { 'x-device-id': deviceId },
                    body: formData,
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Upload failed');
                }

                setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f));
                completed++;
            } catch (err) {
                console.error(`Upload error for ${fileItem.file.name}:`, err);
                setFiles(prev => prev.map(f => f.id === fileItem.id ? {
                    ...f,
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Error'
                } : f));
            }

            setGlobalProgress(Math.round((completed / total) * 100));
        }

        const anyError = files.some(f => f.status === 'error');
        if (completed === total && !anyError) {
            setState('success');
        } else if (anyError) {
            setState('error');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    // Cleanup previews on unmount
    useEffect(() => {
        return () => {
            files.forEach(f => URL.revokeObjectURL(f.preview));
        };
    }, []);

    const reset = () => {
        files.forEach(f => URL.revokeObjectURL(f.preview));
        setFiles([]);
        setState('idle');
        setGlobalProgress(0);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col p-4 sm:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto w-full flex items-center justify-between mb-8"
            >
                <div>
                    <img src="/logo-white.svg" alt="Closerlens" className="h-6 mb-2 opacity-80" />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Subida Masiva
                    </h1>
                </div>
                {files.length > 0 && state !== 'uploading' && (
                    <button
                        onClick={reset}
                        className="text-neutral-500 hover:text-white text-sm transition-colors flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpiar cola
                    </button>
                )}
            </motion.div>

            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
                {/* Drag & Drop Zone */}
                {state !== 'success' && state !== 'uploading' && (
                    <motion.div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all duration-300
                            ${isDragging ? 'border-violet-500 bg-violet-500/10 scale-[1.02]' : 'border-white/10 bg-white/5 hover:border-white/20'}
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                        />

                        <div className="p-4 bg-violet-500/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                            <FileUp className="w-10 h-10 text-violet-400" />
                        </div>

                        <h2 className="text-lg font-medium text-center mb-2">Arrastra tus fotos o vídeos aquí</h2>
                        <p className="text-neutral-500 text-sm text-center mb-6">
                            Soporta selección múltiple de alta calidad
                        </p>

                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-neutral-200 transition-colors flex items-center gap-2"
                            >
                                <Images className="w-5 h-5" />
                                Seleccionar Galería
                            </button>
                            <button
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.setAttribute('capture', 'environment');
                                        fileInputRef.current.click();
                                        fileInputRef.current.removeAttribute('capture');
                                    }
                                }}
                                className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center gap-2"
                            >
                                <Camera className="w-5 h-5" />
                                Cámara
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Status Message for Success/Direct Uploading */}
                {state === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 text-center"
                    >
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">¡Todo subido con éxito!</h2>
                        <p className="text-neutral-400 mb-6">Tus fotos han sido compartidas con el organizador.</p>
                        <button
                            onClick={reset}
                            className="px-8 py-3 bg-white text-black rounded-xl font-bold"
                        >
                            Subir más fotos
                        </button>
                    </motion.div>
                )}

                {/* Processing/Uploading Information */}
                {state === 'uploading' && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                <span className="font-medium">Subiendo archivos...</span>
                            </div>
                            <span className="text-neutral-400 text-sm font-mono">{globalProgress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${globalProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Selected Files Grid */}
                {files.length > 0 && (
                    <div className="space-y-4 mb-24">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                                Cola de subida ({files.length})
                            </h3>
                            {state === 'idle' && (
                                <button
                                    onClick={startUpload}
                                    className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Subir Todo
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <AnimatePresence>
                                {files.map((fileItem) => (
                                    <motion.div
                                        key={fileItem.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="relative aspect-square group rounded-2xl overflow-hidden bg-white/5 border border-white/10"
                                    >
                                        <img
                                            src={fileItem.preview}
                                            alt="Preview"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        />

                                        {/* Overlay status */}
                                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-colors
                                            ${fileItem.status === 'uploading' ? 'bg-black/60' : ''}
                                            ${fileItem.status === 'success' ? 'bg-emerald-500/40 backdrop-blur-[2px]' : ''}
                                            ${fileItem.status === 'error' ? 'bg-red-500/60 transition-colors' : ''}
                                        `}>
                                            {fileItem.status === 'uploading' && (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest">Enviando</span>
                                                </div>
                                            )}
                                            {fileItem.status === 'success' && (
                                                <div className="bg-white rounded-full p-1 shadow-lg">
                                                    <Check className="w-4 h-4 text-emerald-600" />
                                                </div>
                                            )}
                                            {fileItem.status === 'error' && (
                                                <div className="flex flex-col items-center gap-1 p-2 text-center">
                                                    <AlertCircle className="w-5 h-5 text-white" />
                                                    <span className="text-[8px] leading-tight">{fileItem.error || 'Error'}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove button */}
                                        {state === 'idle' && (
                                            <button
                                                onClick={() => removeFile(fileItem.id)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Mobile Button */}
            {files.length > 0 && state === 'idle' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 md:hidden z-50">
                    <button
                        onClick={startUpload}
                        className="w-full py-4 bg-violet-600 rounded-2xl text-white font-bold text-lg shadow-2xl shadow-violet-500/40 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Upload className="w-6 h-6" />
                        Subir {files.length} fotos
                    </button>
                </div>
            )}
        </div>
    );
}

function getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return 'server';
    const key = 'closerlens_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
    }
    return id;
}
