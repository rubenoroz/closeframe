import React from 'react';
import { Copy, Trash2 } from 'lucide-react';

interface ContextMenuProps {
    id: string;
    top: number;
    left: number;
    label?: string;
    onDuplicate: () => void;
    onDelete: () => void;
}

export default function ContextMenu({
    id,
    top,
    left,
    label,
    onDuplicate,
    onDelete,
}: ContextMenuProps) {
    return (
        <div
            style={{ top, left }}
            className="fixed z-[100] flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl overflow-hidden min-w-[160px]"
        >
            <div className="px-3 py-2 text-xs font-semibold text-neutral-500 border-b border-neutral-800 bg-neutral-950/50 truncate max-w-[200px]">
                {label || id}
            </div>
            <button
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors text-left"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            >
                <Copy size={14} />
                Duplicar
            </button>
            <button
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
                <Trash2 size={14} />
                Eliminar
            </button>
        </div>
    );
}
