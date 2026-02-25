"use client";

import React, { useRef } from 'react';
import Papa from 'papaparse';
import { createProject, saveProject } from '@/lib/nodos/storage';
import { FileUp, X, Download, UploadCloud, FileSpreadsheet } from 'lucide-react';

interface CsvUploaderProps {
    onProjectCreated: (id: string) => void;
}

export default function CsvUploader({ onProjectCreated }: CsvUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);

    const processFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                const proj = createProject(file.name.replace('.csv', ''));

                let newNodes: any[] = [];
                let newEdges: any[] = [];

                data.forEach((row, i) => {
                    const id = row.id || `csv_node_${i}`;
                    newNodes.push({
                        id: String(id),
                        type: 'mindmap',
                        position: { x: (i % 4) * 300 + 200, y: Math.floor(i / 4) * 200 + 200 },
                        data: {
                            label: row.label || row.title || row.name || `Nodo ${i}`,
                            description: row.description || '',
                            shape: 'card'
                        }
                    });

                    if (row.parentId) {
                        newEdges.push({
                            id: `e${row.parentId}-${id}`,
                            source: String(row.parentId),
                            target: String(id),
                            sourceHandle: 'bottom-source',
                            targetHandle: 'top-target',
                            type: 'mindmap',
                            animated: true
                        });
                    }
                });

                if (newNodes.length > 0) {
                    proj.nodes = newNodes;
                    proj.edges = newEdges;
                    saveProject(proj);
                }

                setIsOpen(false);
                onProjectCreated(proj.id);
            }
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type === 'text/csv') {
            processFile(file);
        } else {
            alert('Por favor, sube únicamente un archivo .csv');
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

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,id,parentId,label,description\n1,,Idea Principal,El centro del mapa\n2,1,Subtema A,Detalles del tema A\n3,1,Subtema B,Detalles del tema B\n4,2,Punto A1,Más información";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_nodos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 bg-[#141414] hover:bg-[#1C1C1C] text-white text-sm font-medium rounded-md border border-[#2B2B2B] transition-all flex items-center gap-2 active:scale-95"
            >
                <FileUp size={16} />
                <span className="md:inline hidden">Importar CSV</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <FileSpreadsheet size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white tracking-tight">Importar CSV</h2>
                                    <p className="text-xs text-neutral-500">Convierte datos tabulares en un mapa dinámico</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">

                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                                    ${isDragging ? 'border-white bg-white/5' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50'}
                                `}
                            >
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <UploadCloud size={40} className={`mb-4 ${isDragging ? 'text-white' : 'text-neutral-500'}`} />
                                <h3 className="text-base font-medium text-white mb-1">Haz clic o arrastra un archivo</h3>
                                <p className="text-sm text-neutral-500">Archivos .csv hasta 10MB</p>
                            </div>

                            <div className="bg-neutral-950 rounded-xl p-5 border border-neutral-800">
                                <h4 className="text-sm font-medium text-white mb-3">Requisitos de columnas:</h4>
                                <ul className="text-sm text-neutral-400 space-y-2 list-disc pl-4">
                                    <li><code className="bg-neutral-800 text-neutral-200 px-1 py-0.5 rounded text-xs">id</code> (Obligatorio) - Identificador único</li>
                                    <li><code className="bg-neutral-800 text-neutral-200 px-1 py-0.5 rounded text-xs">label</code> (Obligatorio) - Título del nodo</li>
                                    <li><code className="bg-neutral-800 text-neutral-200 px-1 py-0.5 rounded text-xs">parentId</code> (Opcional) - ID del nodo padre</li>
                                    <li><code className="bg-neutral-800 text-neutral-200 px-1 py-0.5 rounded text-xs">description</code> (Opcional) - Texto interno</li>
                                </ul>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
                            <button
                                onClick={downloadTemplate}
                                className="text-sm font-medium text-neutral-400 hover:text-white flex items-center gap-2 transition-colors"
                            >
                                <Download size={16} />
                                <span className="underline underline-offset-4 decoration-neutral-600">Descargar plantilla .csv</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
