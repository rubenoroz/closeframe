"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { FetchedTask } from "@/types/scena";

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    LOW: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Baja" },
    MEDIUM: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "Media" },
    HIGH: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", label: "Alta" },
    URGENT: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Urgente" },
};

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
                        className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded transition-colors flex-shrink-0"
                        title={isCollapsed ? "Expandir subtareas" : "Colapsar subtareas"}
                    >
                        {isCollapsed ? (
                            <ChevronRight size={14} className="text-neutral-500" />
                        ) : (
                            <ChevronDown size={14} className="text-neutral-500" />
                        )}
                    </button>
                )}

                {isHiddenInGantt && (
                    <BarChart3 size={14} className="text-red-400 opacity-50 flex-shrink-0" />
                )}

                <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate flex-1" title={title}>
                    {title}
                </h3>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
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
                <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500 mb-1">
                    <span>Progreso</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
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
