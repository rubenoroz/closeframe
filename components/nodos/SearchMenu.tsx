import React, { useState, useEffect, useRef } from 'react';
import { Search, Command } from 'lucide-react';

export default function SearchMenu({ nodes, onSelectNode }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 10);
            setQuery('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredNodes = nodes.filter((n: any) =>
        n.data.label?.toLowerCase().includes(query.toLowerCase()) ||
        n.data.description?.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <div
                className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center px-4 py-3 border-b border-neutral-800">
                    <Search size={18} className="text-neutral-500 mr-3" />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder-neutral-500"
                        placeholder="Buscar nodos..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="flex items-center gap-1 px-2 py-1 bg-neutral-800 rounded text-xs font-medium text-neutral-400">
                        <Command size={12} /> K
                    </div>
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                    {filteredNodes.length === 0 ? (
                        <div className="py-6 text-center text-sm text-neutral-500">
                            No se encontraron resultados
                        </div>
                    ) : (
                        filteredNodes.map((node: any) => (
                            <button
                                key={node.id}
                                onClick={() => {
                                    onSelectNode(node.id);
                                    setIsOpen(false);
                                }}
                                className="w-full flex flex-col items-start px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors text-left group"
                            >
                                <span className="text-sm font-medium text-neutral-200 group-hover:text-white">{node.data.label}</span>
                                {node.data.description && (
                                    <span className="text-xs text-neutral-500 truncate w-full">{node.data.description}</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
