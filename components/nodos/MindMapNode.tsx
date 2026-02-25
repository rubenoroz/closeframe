import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, ChevronDown, ChevronRight, Plus } from 'lucide-react';

export default memo(({ id, data, selected }: any) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const onQuickAddClick = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        if (data.onQuickAdd) {
            data.onQuickAdd(id, data.color, direction);
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

            {/* Top Handles */}
            <Handle
                type="target"
                position={Position.Top}
                id="top-target"
                className={`group flex items-center justify-center !w-[14px] !h-[14px] !border-[1px] transition-all duration-200 z-20 cursor-pointer ${isCustomColor ? '!bg-white' : '!bg-neutral-800'}`}
                style={isCustomColor ? { borderColor: baseColor } : { borderColor: '#525252' }}
                onClick={(e) => onQuickAddClick(e, 'top')}
            >
                <Plus size={10} strokeWidth={3} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isCustomColor ? 'text-neutral-800' : 'text-neutral-300'}`} />
            </Handle>
            <Handle type="source" position={Position.Top} id="top-source" className="!w-[14px] !h-[14px] bg-transparent border-transparent opacity-0 pointer-events-none" />

            {/* Bottom Handles */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom-source"
                className={`group flex items-center justify-center !w-[14px] !h-[14px] !border-[1px] transition-all duration-200 z-20 cursor-pointer ${isCustomColor ? '!bg-white' : '!bg-neutral-800'}`}
                style={isCustomColor ? { borderColor: baseColor } : { borderColor: '#525252' }}
                onClick={(e) => onQuickAddClick(e, 'bottom')}
            >
                <Plus size={10} strokeWidth={3} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isCustomColor ? 'text-neutral-800' : 'text-neutral-300'}`} />
            </Handle>
            <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-[14px] !h-[14px] bg-transparent border-transparent opacity-0 pointer-events-none" />

            {/* Left Handles */}
            <Handle
                type="target"
                position={Position.Left}
                id="left-target"
                className={`group flex items-center justify-center !w-[14px] !h-[14px] !border-[1px] transition-all duration-200 z-20 cursor-pointer ${isCustomColor ? '!bg-white' : '!bg-neutral-800'}`}
                style={isCustomColor ? { borderColor: baseColor } : { borderColor: '#525252' }}
                onClick={(e) => onQuickAddClick(e, 'left')}
            >
                <Plus size={10} strokeWidth={3} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isCustomColor ? 'text-neutral-800' : 'text-neutral-300'}`} />
            </Handle>
            <Handle type="source" position={Position.Left} id="left-source" className="!w-[14px] !h-[14px] bg-transparent border-transparent opacity-0 pointer-events-none" />

            {/* Right Handles */}
            <Handle
                type="source"
                position={Position.Right}
                id="right-source"
                className={`group flex items-center justify-center !w-[14px] !h-[14px] !border-[1px] transition-all duration-200 z-20 cursor-pointer ${isCustomColor ? '!bg-white' : '!bg-neutral-800'}`}
                style={isCustomColor ? { borderColor: baseColor } : { borderColor: '#525252' }}
                onClick={(e) => onQuickAddClick(e, 'right')}
            >
                <Plus size={10} strokeWidth={3} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isCustomColor ? 'text-neutral-800' : 'text-neutral-300'}`} />
            </Handle>
            <Handle type="target" position={Position.Right} id="right-target" className="!w-[14px] !h-[14px] bg-transparent border-transparent opacity-0 pointer-events-none" />

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
});
