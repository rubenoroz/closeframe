'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Check, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadProgress {
    total: number;
    completed: number;
    failed: number;
}

export default function GuestUploadClient({ token }: { token: string }) {
    const [state, setState] = useState<UploadState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<UploadProgress>({ total: 0, completed: 0, failed: 0 });
    const [deviceId] = useState(() => getOrCreateDeviceId());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const compressImage = async (file: File): Promise<File> => {
        // Only convert images
        if (!file.type.startsWith('image/')) return file;

        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);

                let width = img.width;
                let height = img.height;
                const maxDim = 2048; // Max dimension

                // Scaling logic
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
                    resolve(file); // Fallback
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG with quality 0.8
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        resolve(file); // Fallback
                    }
                }, 'image/jpeg', 0.8);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file); // Fallback
            };

            img.src = url;
        });
    };

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setState('uploading');
        setError(null);
        setProgress({ total: files.length, completed: 0, failed: 0 });

        // Process files one by one to avoid memory issues on mobile
        const results = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                // Compress/Convert first
                const processedFile = await compressImage(file);

                const formData = new FormData();
                formData.append('file', processedFile);

                const res = await fetch(`/api/upload/${token}`, {
                    method: 'POST',
                    headers: {
                        'x-device-id': deviceId,
                    },
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Upload failed');
                }

                setProgress(p => ({ ...p, completed: p.completed + 1 }));
                results.push({ success: true });

            } catch (err) {
                console.error(`Upload error for ${file.name}:`, err);
                setProgress(p => ({ ...p, failed: p.failed + 1 }));
                results.push({
                    success: false,
                    error: err instanceof Error ? err.message : 'Upload failed'
                });
            }
        }

        const failedCount = results.filter(r => !r.success).length;
        const lastError = results.find(r => !r.success)?.error;

        if (failedCount === files.length) {
            setState('error');
            setError(lastError || 'All uploads failed');
        } else if (failedCount > 0) {
            setState('success'); // Show success but maybe warn? For now simple success
            setError(`${failedCount} file(s) could not be uploaded`);
        } else {
            setState('success');
        }
    }, [token, deviceId]);

    const handleReset = () => {
        setState('idle');
        setError(null);
        setProgress({ total: 0, completed: 0, failed: 0 });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col items-center"
            >
                <img src="/logo-white.svg" alt="Closerlens" className="h-8 mb-4 opacity-90" />
                <p className="text-slate-400 text-sm">Comparte tus mejores fotos del evento</p>
            </motion.div>

            {/* Main Card */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm"
            >
                <AnimatePresence mode="wait">
                    {state === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
                                onChange={(e) => handleFileSelect(e.target.files)}
                                className="hidden"
                            />

                            <div className="space-y-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-6 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-2xl text-white font-semibold flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-violet-500/25"
                                >
                                    <ImageIcon className="w-6 h-6" />
                                    Select Photos
                                </button>

                                <button
                                    onClick={() => {
                                        if (fileInputRef.current) {
                                            fileInputRef.current.setAttribute('capture', 'environment');
                                            fileInputRef.current.click();
                                            fileInputRef.current.removeAttribute('capture');
                                        }
                                    }}
                                    className="w-full py-4 px-4 bg-white/10 hover:bg-white/15 rounded-2xl text-white font-medium flex items-center justify-center gap-3 transition-all duration-200"
                                >
                                    <Camera className="w-5 h-5" />
                                    Take a Photo
                                </button>
                            </div>

                            <p className="text-center text-slate-500 text-xs mt-6">
                                JPG, PNG, HEIC • Max 15MB per photo
                            </p>
                        </motion.div>
                    )}

                    {state === 'uploading' && (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 text-center"
                        >
                            <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
                            <p className="text-white font-medium mb-2">Uploading...</p>
                            <p className="text-slate-400 text-sm">
                                {progress.completed} of {progress.total} photos
                            </p>

                            {/* Progress bar */}
                            <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {state === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-emerald-500/30 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.1 }}
                                className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <Check className="w-8 h-8 text-emerald-400" />
                            </motion.div>
                            <h3 className="text-white font-semibold text-lg mb-2">Photos Shared!</h3>
                            <p className="text-slate-400 text-sm mb-2">
                                {progress.completed} photo{progress.completed !== 1 ? 's' : ''} uploaded successfully
                            </p>
                            {error && (
                                <p className="text-amber-400 text-xs mb-4">{error}</p>
                            )}
                            <button
                                onClick={handleReset}
                                className="mt-4 py-3 px-6 bg-white/10 hover:bg-white/15 rounded-xl text-white font-medium transition-all duration-200"
                            >
                                Upload More
                            </button>
                        </motion.div>
                    )}

                    {state === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-red-500/30 text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-2">Upload Failed</h3>
                            <p className="text-slate-400 text-sm mb-4">{error}</p>
                            <button
                                onClick={handleReset}
                                className="py-3 px-6 bg-white/10 hover:bg-white/15 rounded-xl text-white font-medium transition-all duration-200"
                            >
                                Try Again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Footer */}
            <p className="text-slate-600 text-xs mt-8">
                Powered by Closerlens
            </p>
        </div>
    );
}

/**
 * Generate or retrieve a persistent device ID.
 */
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
