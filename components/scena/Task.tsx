"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { FetchedTask } from "@/types/scena";
import { useMemo } from "react";

// Priority styles with solid backgrounds for good contrast on any card color
const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    LOW: { bg: "bg-blue-600", text: "text-white", label: "Baja" },
    MEDIUM: { bg: "bg-amber-500", text: "text-white", label: "Media" },
    HIGH: { bg: "bg-orange-600", text: "text-white", label: "Alta" },
    URGENT: { bg: "bg-red-600", text: "text-white", label: "Urgente" },
};

// Helper to determine if a color is light or dark
function isLightColor(hexColor: string): boolean {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Handle shorthand hex (e.g., #FFF)
    const fullHex = hex.length === 3
        ? hex.split('').map(c => c + c).join('')
        : hex;

    if (fullHex.length !== 6) return true; // Default to light if invalid

    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);

    // Calculate relative luminance using the formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.6; // If luminance > 0.6, it's a light color
}

interface TaskProps {
    task: FetchedTask;
    onClick: (taskId: string) => void;
    cardColor?: string;
    isCollapsed?: boolean;
    onToggleCollapse?: (taskId: string) => void;
    isActive?: boolean;
    isOverlay?: boolean;
}

export function Task({
    task,
    onClick,
    cardColor,
    isCollapsed = false,
    onToggleCollapse,
    isActive = false,
    isOverlay = false,
}: TaskProps) {
    const { id, title, priority, progress = 0, children, level = 0, isHiddenInGantt, checklist } = task;

    // Determine if we need dark text (for light backgrounds) or light text (for dark backgrounds)
    const isLight = useMemo(() => {
        if (!cardColor) return true; // Default white background = light
        return isLightColor(cardColor);
    }, [cardColor]);

    const sortable = useSortable({
        id,
        disabled: isOverlay,
        data: { type: "Task" },
    });

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = sortable;

    const style = {
        transition: isDragging ? 'none' : 'transform 150ms ease, opacity 150ms ease',
        transform: isOverlay ? undefined : CSS.Transform.toString(transform),
        marginLeft: level > 0 ? `${level * 16}px` : '0',
        backgroundColor: cardColor || '#FFFFFF',
        opacity: isDragging ? 0 : 1,
        borderLeftWidth: level > 0 ? '3px' : '0',
        borderLeftColor: level > 0 ? '#CBD5E1' : 'transparent',
    };

    const subtasksCount = children?.length || 0;
    const parsedChecklist = checklist ? JSON.parse(checklist) : [];
    const completedChecklist = parsedChecklist.filter((i: any) => i.completed).length;
    const totalChecklist = parsedChecklist.length;
    const priorityStyle = priority ? PRIORITY_STYLES[priority] : null;

    // Dynamic text colors based on background
    const textPrimary = isLight ? 'text-neutral-800' : 'text-white';
    const textSecondary = isLight ? 'text-neutral-600' : 'text-neutral-200';
    const textMuted = isLight ? 'text-neutral-500' : 'text-neutral-300';
    const bgHover = isLight ? 'hover:bg-neutral-200' : 'hover:bg-white/20';
    const progressBg = isLight ? 'bg-neutral-300' : 'bg-neutral-600';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(id)}
            className={`group p-3 rounded-lg shadow-sm border border-neutral-200/50 dark:border-neutral-700/30 transition-all duration-200 cursor-pointer hover:shadow-md ${isDragging ? "shadow-xl scale-105" : ""
                } ${isActive ? "ring-2 ring-blue-500" : ""}`}
        >
            {/* Priority Badge */}
            {priorityStyle && (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${priorityStyle.bg} ${priorityStyle.text}`}>
                    {priorityStyle.label}
                </span>
            )}

            {/* Title Row */}
            <div className="flex items-center gap-2">
                {subtasksCount > 0 && onToggleCollapse && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(id);
                        }}
                        className={`p-0.5 ${bgHover} rounded transition-colors flex-shrink-0`}
                        title={isCollapsed ? "Expandir subtareas" : "Colapsar subtareas"}
                    >
                        {isCollapsed ? (
                            <ChevronRight size={14} className={textSecondary} />
                        ) : (
                            <ChevronDown size={14} className={textSecondary} />
                        )}
                    </button>
                )}

                {isHiddenInGantt && (
                    <BarChart3 size={14} className="text-red-400 opacity-50 flex-shrink-0" />
                )}

                <h3 className={`text-sm font-medium ${textPrimary} truncate flex-1`} title={title}>
                    {title}
                </h3>
            </div>

            {/* Metadata */}
            <div className={`flex items-center gap-3 mt-2 text-xs ${textMuted}`}>
                {subtasksCount > 0 && (
                    <span className="flex items-center gap-1">
                        <CheckSquare size={12} />
                        {subtasksCount} sub
                    </span>
                )}

                {totalChecklist > 0 && (
                    <span className="flex items-center gap-1">
                        <CheckSquare size={12} />
                        {completedChecklist}/{totalChecklist}
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <div className={`flex justify-between text-xs ${textMuted} mb-1`}>
                    <span>Progreso</span>
                    <span>{progress}%</span>
                </div>
                <div className={`w-full h-1.5 ${progressBg} rounded-full overflow-hidden`}>
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                            }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
