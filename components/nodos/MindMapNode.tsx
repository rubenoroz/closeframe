import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useQuickAdd } from './QuickAddContext';

// QuickAdd button — positioned OUTSIDE the node, beyond the handle
function QuickAddButton({ direction, onClick, isCustomColor, baseColor }: {
    direction: 'top' | 'bottom' | 'left' | 'right';
    onClick: (e: React.MouseEvent, direction: string) => void;
    isCustomColor: boolean;
    baseColor: string;
}) {
    const positionStyles: Record<string, React.CSSProperties> = {
        top: { top: -24, left: '50%', transform: 'translateX(-50%)' },
        bottom: { bottom: -24, left: '50%', transform: 'translateX(-50%)' },
        left: { left: -24, top: '50%', transform: 'translateY(-50%)' },
        right: { right: -24, top: '50%', transform: 'translateY(-50%)' },
    };

    return (
        <button
            className={`absolute z-30 w-[16px] h-[16px] rounded-full border flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-125 group ${isCustomColor ? 'bg-white/90 hover:bg-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
            style={{
                ...positionStyles[direction],
                borderColor: isCustomColor ? baseColor : '#525252',
            }}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClick(e, direction);
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
            }}
        >
            <Plus size={10} strokeWidth={3} className={`${isCustomColor ? 'text-neutral-800' : 'text-neutral-300'}`} />
        </button>
    );
}

export default function MindMapNode({ id, data, selected }: any) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const quickAdd = useQuickAdd();

    const onQuickAddClick = (e: React.MouseEvent, direction: string) => {
        if (quickAdd) {
            quickAdd(id, data.color, direction);
        }
    };

    // Dynamic color styles
    const baseColor = data.color || 'default';
    const isCustomColor = baseColor !== 'default';
    const shape = data.shape || 'card';

    const currentStyle = isCustomColor
        ? `text-neutral-900 ${shape === 'line' ? 'bg-transparent border-b-[3px] rounded-none px-2 py-1' : ''}`
        : `border border-neutral-800 bg-neutral-900/60 text-neutral-200 ${shape === 'line' ? 'bg-transparent border-b-[3px] border-t-0 border-l-0 border-r-0 rounded-none px-2 py-1' : ''}`;

    const shapeClasses = {
        card: `px-3 py-2 min-w-[140px] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] ${selected ? 'scale-[1.02] border-[2px]' : 'hover:scale-[1.01] border-[1px]'}`,
        pill: `px-5 py-2 min-w-[120px] rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.15)] flex items-center justify-center font-semibold ${selected ? 'scale-[1.05] border-[2px]' : 'hover:scale-[1.02] border-[1px]'}`,
        line: `min-w-[100px] font-medium rounded-none flex items-center justify-center pb-1 ${selected ? 'opacity-100 scale-[1.05] border-b-[4px]' : 'opacity-80 hover:opacity-100 border-b-[2px]'} !border-t-0 !border-l-0 !border-r-0`
    };

    // Handle style: visible circles for drag-to-connect
    const handleStyle = (pos: 'top' | 'bottom' | 'left' | 'right') => ({
        borderColor: isCustomColor ? baseColor : '#525252',
    });

    const handleClass = `!w-[12px] !h-[12px] !border-[1.5px] transition-all duration-200 z-20 ${isCustomColor ? '!bg-white/80 hover:!bg-white' : '!bg-neutral-700 hover:!bg-neutral-600'}`;
    const hiddenHandleClass = '!w-[12px] !h-[12px] !bg-transparent !border-transparent pointer-events-none';

    return (
        <div
            className={`relative transition-all duration-300 ease-in-out backdrop-blur-md ${currentStyle} ${shapeClasses[shape as keyof typeof shapeClasses]}`}
            style={
                isCustomColor && shape !== 'line'
                    ? {
                        backgroundColor: baseColor,
                        borderColor: selected ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.05)'
                    }
                    : (isCustomColor && shape === 'line' ? { borderColor: baseColor, color: baseColor } : undefined)
            }
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >

            {/* Connection handles — visible, draggable for creating connections */}
            <Handle type="target" position={Position.Top} id="top-target" className={handleClass} style={handleStyle('top')} />
            <Handle type="source" position={Position.Top} id="top-source" className={hiddenHandleClass} />

            <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClass} style={handleStyle('bottom')} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" className={hiddenHandleClass} />

            <Handle type="target" position={Position.Left} id="left-target" className={handleClass} style={handleStyle('left')} />
            <Handle type="source" position={Position.Left} id="left-source" className={hiddenHandleClass} />

            <Handle type="source" position={Position.Right} id="right-source" className={handleClass} style={handleStyle('right')} />
            <Handle type="target" position={Position.Right} id="right-target" className={hiddenHandleClass} />

            {/* QuickAdd buttons — appear OUTSIDE the node, beyond the handles */}
            {(isHovered || selected) && (
                <>
                    <QuickAddButton direction="top" onClick={onQuickAddClick} isCustomColor={isCustomColor} baseColor={baseColor} />
                    <QuickAddButton direction="bottom" onClick={onQuickAddClick} isCustomColor={isCustomColor} baseColor={baseColor} />
                    <QuickAddButton direction="left" onClick={onQuickAddClick} isCustomColor={isCustomColor} baseColor={baseColor} />
                    <QuickAddButton direction="right" onClick={onQuickAddClick} isCustomColor={isCustomColor} baseColor={baseColor} />
                </>
            )}

            {/* Node Content based on Shape */}
            {shape === 'card' && (
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isCustomColor ? 'bg-black/5' : (selected ? 'bg-neutral-800' : 'bg-neutral-800/50')}`}>
                            <FileText size={14} className={isCustomColor ? 'text-neutral-700' : (selected ? 'text-white' : 'text-neutral-400')} />
                        </div>
                        <div className="flex flex-col max-w-[160px]">
                            <div className="text-xs font-medium pr-2 break-words whitespace-normal">{data.label}</div>
                            {!isCollapsed && data.description && (
                                <div className={`text-[11px] mt-0.5 pr-2 break-words whitespace-normal ${isCustomColor ? 'text-neutral-600' : 'text-neutral-500'}`}>
                                    {data.description}
                                </div>
                            )}
                        </div>
                    </div>

                    {data.description && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
                            className={`p-1 rounded transition-colors ${isCustomColor ? 'hover:bg-black/10 text-neutral-600 hover:text-neutral-900' : 'hover:bg-neutral-800 text-neutral-500 hover:text-white'}`}
                        >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                </div>
            )}

            {shape === 'pill' && (
                <div className={`text-base font-semibold text-center whitespace-normal break-words max-w-[300px] ${isCustomColor ? 'text-neutral-900' : 'text-neutral-100'}`}>
                    {data.label}
                </div>
            )}

            {shape === 'line' && (
                <div className={`text-lg font-medium text-center whitespace-normal break-words max-w-[260px] ${isCustomColor ? 'text-inherit' : 'text-neutral-200'}`}>
                    {data.label}
                </div>
            )}


        </div>
    );
}
