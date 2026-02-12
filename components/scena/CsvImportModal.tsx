"use client";

import { useState, useRef, useCallback } from "react";
import {
    Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X,
    Columns3, ListTodo, GitBranch, Download, Loader2, ArrowRight, ArrowLeft
} from "lucide-react";
import { parseCsvForScena, CsvParseResult } from "@/lib/scena/csv-parser";
import { useRouter } from "next/navigation";

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingProjectId?: string;
    existingProjectName?: string;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function CsvImportModal({ isOpen, onClose, existingProjectId, existingProjectName }: CsvImportModalProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<Step>('upload');
    const [fileName, setFileName] = useState('');
    const [csvContent, setCsvContent] = useState('');
    const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [importError, setImportError] = useState('');
    const [importResult, setImportResult] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);

    const resetState = useCallback(() => {
        setStep('upload');
        setFileName('');
        setCsvContent('');
        setParseResult(null);
        setProjectName('');
        setDescription('');
        setImportError('');
        setImportResult(null);
        setIsDragging(false);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [onClose, resetState]);

    const processFile = useCallback((file: File) => {
        if (!file.name.endsWith('.csv')) {
            setImportError('Solo se aceptan archivos .csv');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setImportError('El archivo no debe superar 5MB');
            return;
        }

        setImportError('');
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setCsvContent(content);

            const result = parseCsvForScena(content);
            setParseResult(result);

            // Set project name from file name (without .csv extension)
            if (!existingProjectId) {
                const name = file.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' ');
                setProjectName(name);
            }

            if (result.errors.length === 0) {
                setStep('preview');
            }
        };
        reader.readAsText(file);
    }, [existingProjectId]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleImport = useCallback(async () => {
        if (!csvContent) return;

        setStep('importing');
        setImportError('');

        try {
            const res = await fetch('/api/scena/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    csvContent,
                    projectName: existingProjectId ? undefined : projectName,
                    description: existingProjectId ? undefined : description,
                    projectId: existingProjectId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setImportError(data.error || 'Error al importar');
                setStep('preview');
                return;
            }

            setImportResult(data);
            setStep('done');
        } catch (err) {
            setImportError('Error de conexión al importar');
            setStep('preview');
        }
    }, [csvContent, projectName, existingProjectId, description]);

    const handleDownloadTemplate = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Create a hidden anchor tag to force download
        // This is more reliable for Chrome than window.location.href
        const link = document.createElement('a');
        link.href = '/api/scena/projects/import/template';
        link.setAttribute('download', 'plantilla_scena.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white">
                                {existingProjectId ? 'Importar tareas' : 'Importar proyecto'}
                            </h2>
                            <p className="text-xs text-neutral-500">
                                {step === 'upload' && 'Selecciona un archivo CSV'}
                                {step === 'preview' && 'Revisa antes de importar'}
                                {step === 'importing' && 'Importando...'}
                                {step === 'done' && '¡Importación completada!'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-neutral-800 rounded-lg transition text-neutral-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Step: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            {/* Dropzone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                                    ? 'border-emerald-500 bg-emerald-500/5'
                                    : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/30'
                                    }`}
                            >
                                <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-emerald-400' : 'text-neutral-500'}`} />
                                <p className="text-neutral-300 font-medium mb-1">
                                    {isDragging ? 'Suelta el archivo aquí' : 'Arrastra o haz clic para subir'}
                                </p>
                                <p className="text-xs text-neutral-500">Archivos .csv hasta 5MB</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            {/* Parse errors (if any from an earlier attempt) */}
                            {parseResult && parseResult.errors.length > 0 && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-red-400" />
                                        <p className="text-sm font-medium text-red-400">
                                            {parseResult.errors.length} error{parseResult.errors.length > 1 ? 'es' : ''} encontrado{parseResult.errors.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                        {parseResult.errors.map((err, i) => (
                                            <li key={i} className="text-xs text-red-300/80">
                                                Fila {err.row}: <span className="text-red-300">{err.message}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {importError && (
                                <p className="text-sm text-red-400 text-center">{importError}</p>
                            )}

                            {/* Download Template */}
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar plantilla CSV
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Preview */}
                    {step === 'preview' && parseResult && (
                        <div className="space-y-5">
                            {/* File info */}
                            <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium truncate">{fileName}</p>
                                    <p className="text-xs text-neutral-500">{parseResult.stats.totalRows} filas detectadas</p>
                                </div>
                                <button
                                    onClick={() => { resetState(); }}
                                    className="text-xs text-neutral-400 hover:text-white transition px-2 py-1 hover:bg-neutral-700 rounded-lg"
                                >
                                    Cambiar
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                    <Columns3 className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-white">{parseResult.stats.totalPhases}</p>
                                    <p className="text-xs text-neutral-500">Columnas</p>
                                </div>
                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                    <ListTodo className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-white">{parseResult.stats.validRows}</p>
                                    <p className="text-xs text-neutral-500">Tareas</p>
                                </div>
                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                    <GitBranch className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-white">{parseResult.stats.totalParents}</p>
                                    <p className="text-xs text-neutral-500">Subtareas</p>
                                </div>
                            </div>

                            {/* Phases */}
                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-medium">Columnas Kanban</p>
                                <div className="flex flex-wrap gap-2">
                                    {parseResult.phases.map((phase, i) => (
                                        <span key={i} className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300">
                                            {phase}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Project name input */}
                            {!existingProjectId && (
                                <div>
                                    <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-medium block">
                                        Nombre del proyecto
                                    </label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="Nombre del proyecto"
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                                    />
                                </div>
                            )}

                            {/* Project description input */}
                            {!existingProjectId && (
                                <div>
                                    <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-medium block">
                                        Descripción (Cliente, Fecha, Notas)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ej: Cliente: Juan Pérez&#10;Fecha: 10/10/2026&#10;Notas: Campaña publicitaria"
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition resize-none"
                                    />
                                </div>
                            )}

                            {/* Warnings */}
                            {parseResult.warnings.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        <p className="text-sm font-medium text-amber-400">
                                            {parseResult.warnings.length} advertencia{parseResult.warnings.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <ul className="space-y-1 max-h-24 overflow-y-auto">
                                        {parseResult.warnings.map((w, i) => (
                                            <li key={i} className="text-xs text-amber-300/80">{w.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {importError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    <p className="text-sm text-red-400">{importError}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={resetState}
                                    className="flex-1 px-4 py-2.5 border border-neutral-700 rounded-xl text-neutral-300 hover:bg-neutral-800 transition text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={!projectName && !existingProjectId}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-xl text-white transition text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    Importar
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center py-10 gap-4">
                            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                            <p className="text-neutral-300 font-medium">Importando proyecto...</p>
                            <p className="text-xs text-neutral-500">Creando columnas y tareas</p>
                        </div>
                    )}

                    {/* Step: Done */}
                    {step === 'done' && importResult && (
                        <div className="space-y-5">
                            <div className="flex flex-col items-center py-6 gap-3">
                                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <p className="text-lg font-semibold text-white">¡Proyecto importado!</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-white">{importResult.stats.columns}</p>
                                    <p className="text-xs text-neutral-500">Columnas</p>
                                </div>
                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-white">{importResult.stats.tasks}</p>
                                    <p className="text-xs text-neutral-500">Tareas</p>
                                </div>
                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-white">{importResult.stats.parents}</p>
                                    <p className="text-xs text-neutral-500">Subtareas</p>
                                </div>
                            </div>

                            {importResult.stats.warnings?.length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                    <p className="text-xs text-amber-400 font-medium mb-1">Advertencias:</p>
                                    <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                                        {importResult.stats.warnings.map((w: string, i: number) => (
                                            <li key={i} className="text-xs text-amber-300/70">{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    handleClose();
                                    router.push(`/dashboard/scena/${importResult.projectId}`);
                                }}
                                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white transition text-sm font-medium"
                            >
                                Abrir proyecto
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
