'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode,
    Plus,
    Download,
    ExternalLink,
    Pause,
    Play,
    Trash2,
    Loader2,
    Copy,
    Check,
    Image as ImageIcon,
    Upload,
    Sparkles
} from 'lucide-react';

interface QrSection {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    uploadCount: number;
    accessCount: number;
    createdAt: string;
}

interface CollaborativeGalleryData {
    id: string;
    isActive: boolean;
    driveFolderId: string;
    totalUploads: number;
    sections: QrSection[];
    limits: {
        maxFilesTotal: number | null;
        maxFilesPerSection: number | null;
        maxFilesPerDevice: number | null;
        maxFileSizeBytes: number | null;
        allowVideo: boolean;
    };
}

interface Props {
    projectId: string;
    isGoogleDrive: boolean;
}

export default function CollaborativeSettings({ projectId, isGoogleDrive }: Props) {
    const [data, setData] = useState<CollaborativeGalleryData | null>(null);
    const [featureAvailable, setFeatureAvailable] = useState(false);
    const [hasEligiblePlan, setHasEligiblePlan] = useState(false);
    const [loading, setLoading] = useState(true);
    const [enabling, setEnabling] = useState(false);
    const [creatingSection, setCreatingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/collaborative`);
            const json = await res.json();
            setHasEligiblePlan(json.hasEligiblePlan || false);
            setFeatureAvailable(json.featureAvailable || false);

            // Set data only if gallery exists AND is active
            if (json.featureAvailable && json.collaborativeGallery && json.collaborativeGallery.isActive) {
                setData(json.collaborativeGallery);
            } else {
                setData(null); // Reset data when gallery doesn't exist or is inactive
            }
        } catch (error) {
            console.error('Failed to fetch collaborative data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isGoogleDrive) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [projectId, isGoogleDrive]);

    const handleEnable = async () => {
        setEnabling(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/collaborative`, { method: 'POST' });
            if (res.ok) {
                await fetchData();
            } else {
                const err = await res.json();
                console.error("Failed to enable collaborative gallery:", err);
                alert("Error al activar: " + (err.error || "Error desconocido"));
            }
        } catch (error) {
            console.error('Failed to enable:', error);
        } finally {
            setEnabling(false);
        }
    };

    const handleDisable = async () => {
        try {
            await fetch(`/api/projects/${projectId}/collaborative`, { method: 'DELETE' });
            await fetchData();
        } catch (error) {
            console.error('Failed to disable:', error);
        }
    };

    const handleCreateSection = async () => {
        if (!newSectionName.trim()) return;
        setCreatingSection(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/collaborative/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSectionName.trim() }),
            });
            if (res.ok) {
                setNewSectionName('');
                setShowAddModal(false);
                await fetchData();
            }
        } catch (error) {
            console.error('Failed to create section:', error);
        } finally {
            setCreatingSection(false);
        }
    };

    const handleDownloadQR = async (sectionId: string, sectionName: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/collaborative/sections/${sectionId}/qr`);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const msg = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || 'Error al descargar QR');
                throw new Error(msg);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QR-${sectionName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download QR:', error);
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            alert(`Error al descargar el código QR: ${msg}`);
        }
    };

    const handleCopyLink = async (slug: string) => {
        const url = `${window.location.origin}/upload/${slug}`;
        await navigator.clipboard.writeText(url);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    // Don't show if not Google Drive
    if (!isGoogleDrive) return null;

    if (loading) {
        return (
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    <span className="text-slate-400">Loading...</span>
                </div>
            </div>
        );
    }

    // Show upgrade message for non-eligible plans
    if (!hasEligiblePlan) {
        return (
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/20">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">Galerías Colaborativas</h3>
                        <p className="text-slate-400 text-sm">Disponible en planes Studio y Agency</p>
                    </div>
                </div>
                <p className="text-slate-300 text-sm mb-4">
                    Permite que los invitados de tu evento suban fotos escaneando códigos QR.
                    Las fotos van directamente a tu Google Drive organizadas por sección.
                </p>
                <a
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all"
                >
                    <Sparkles className="w-4 h-4" />
                    Mejorar Plan
                </a>
            </div>
        );
    }

    return (
        <div className="bg-neutral-900 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-2xl p-4 sm:p-6 border border-violet-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                        <QrCode className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            Galería Colaborativa
                        </h2>
                        <p className="text-violet-200/60">
                            Deja que tus invitados suban fotos vía código QR
                        </p>
                    </div>
                </div>

                {data ? (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDisable(); }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    >
                        Desactivar
                    </button>
                ) : (
                    <button
                        onClick={handleEnable}
                        disabled={enabling}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        {enabling ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                        Activar Galería
                    </button>
                )}
            </div>

            {data && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-slate-400 text-xs mb-1">Total Subidas</p>
                            <p className="text-2xl font-bold text-white">{data.totalUploads}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-slate-400 text-xs mb-1">Secciones QR</p>
                            <p className="text-2xl font-bold text-white">{data.sections.length}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-slate-400 text-xs mb-1">Estado</p>
                            <p className="text-lg font-medium text-emerald-400">Activo</p>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium">Secciones QR</h4>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar Sección
                            </button>
                        </div>

                        {data.sections.length === 0 ? (
                            <div className="bg-white/5 rounded-xl p-6 text-center">
                                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm">No hay secciones aún. Crea una para generar un código QR.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data.sections.map((section) => (
                                    <motion.div
                                        key={section.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-violet-500/20 rounded-lg">
                                                <QrCode className="w-4 h-4 text-violet-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{section.name}</p>
                                                <p className="text-slate-500 text-xs">
                                                    {section.uploadCount} subidas • {section.accessCount} escaneos
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyLink(section.slug);
                                                }}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Copiar enlace"
                                            >
                                                {copiedSlug === section.slug ? (
                                                    <Check className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-slate-400" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadQR(section.id, section.name);
                                                }}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Descargar QR"
                                            >
                                                <Download className="w-4 h-4 text-slate-400" />
                                            </button>
                                            <a
                                                href={`/upload/${section.slug}`}
                                                onClick={(e) => e.stopPropagation()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Abrir página de subida"
                                            >
                                                <ExternalLink className="w-4 h-4 text-slate-400" />
                                            </a>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Add Section Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 - 1 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10"
                        >
                            <h3 className="text-white font-semibold text-lg mb-4">Nueva Sección QR</h3>
                            <input
                                type="text"
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                placeholder="ej. Mesa 1, Zona VIP, Día 1..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 mb-4"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateSection}
                                    disabled={creatingSection || !newSectionName.trim()}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {creatingSection && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Crear
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
