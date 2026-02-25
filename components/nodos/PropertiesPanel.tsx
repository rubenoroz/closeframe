import React from 'react';
import { X, Palette, Type } from 'lucide-react';

export default function PropertiesPanel({ node, onClose, onUpdate }: any) {
    if (!node) return null;

    return (
        <div className="absolute top-4 right-4 w-80 bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-40 flex flex-col transition-all">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <h3 className="text-sm font-semibold text-white">Propiedades del Nodo</h3>
                <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400">Título</label>
                    <input
                        type="text"
                        value={node.data.label || ''}
                        onChange={(e) => onUpdate(node.id, { label: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                        placeholder="Título del nodo"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400">Descripción</label>
                    <textarea
                        rows={4}
                        value={node.data.description || ''}
                        onChange={(e) => onUpdate(node.id, { description: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors resize-none"
                        placeholder="Agrega una descripción..."
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                        <Type size={12} />
                        Forma del Nodo
                    </label>
                    <div className="flex gap-2 mt-2">
                        {['card', 'pill', 'line'].map((shape) => {
                            const isSelected = (node.data.shape || 'card') === shape;
                            const labels: Record<string, string> = { card: 'Tarjeta', pill: 'Píldora', line: 'Texto' };
                            return (
                                <button
                                    key={shape}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${isSelected
                                        ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                                        : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                                        }`}
                                    onClick={() => onUpdate(node.id, { shape })}
                                >
                                    {labels[shape]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-1.5 mt-4">
                    <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                        <Palette size={12} />
                        Color Temático
                    </label>
                    <div className="grid grid-cols-3 gap-3 mt-2 justify-items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                        {[
                            '#FBCFE8', // Pink
                            '#C7D2FE', // Indigo
                            '#BFDBFE', // Blue
                            '#A7F3D0', // Emerald
                            '#FEF08A', // Yellow
                            '#FED7AA', // Orange
                            '#E9D5FF', // Purple
                            '#99F6E4', // Teal
                            '#D9F99D', // Lime
                            '#E2E8F0', // Slate
                            '#FECDD3', // Rose
                            '#BAE6FD', // Sky
                        ].map((hex) => {
                            const isSelected = node.data.color === hex;
                            return (
                                <button
                                    key={hex}
                                    style={{ backgroundColor: hex }}
                                    className={`w-7 h-7 rounded-full transition-all ${isSelected
                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950 scale-110 shadow-lg'
                                        : 'hover:scale-110 opacity-90 hover:opacity-100'
                                        }`}
                                    onClick={() => onUpdate(node.id, { color: isSelected ? 'default' : hex })}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
