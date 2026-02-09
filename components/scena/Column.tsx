"use client";
import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "./Task";
import { Plus, X, GripVertical, Palette } from "lucide-react";
import { FetchedColumn, FetchedTask } from "@/types/scena";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Pastel color pairs from scena-v1
const COLUMN_COLORS = [
    { column: "#FBCFE8", card: "#FFF1F2" }, // Pink
    { column: "#C7D2FE", card: "#EEF2FF" }, // Indigo
    { column: "#BFDBFE", card: "#EFF6FF" }, // Blue
    { column: "#A7F3D0", card: "#F0FDFA" }, // Emerald
    { column: "#FEF08A", card: "#FEFCE8" }, // Yellow
    { column: "#FED7AA", card: "#FFF7ED" }, // Orange
    { column: "#E9D5FF", card: "#FAFAF5" }, // Purple
];

interface ColumnProps {
    column: FetchedColumn;
    tasks: FetchedTask[];
    onAddTask: (columnId: string) => void;
    onEditColumn: (columnId: string, name: string) => void;
    onDeleteColumn: (columnId: string) => void;
    onTaskClick: (taskId: string) => void;
    onColorChange: (columnId: string, color: string, cardColor: string) => void;
    collapsedTasks: Set<string>;
    onToggleCollapse: (taskId: string) => void;
    activeTaskId?: string;
}

export function Column({
    column,
    tasks,
    onAddTask,
    onEditColumn,
    onDeleteColumn,
    onTaskClick,
    onColorChange,
    collapsedTasks,
    onToggleCollapse,
    activeTaskId,
}: ColumnProps) {
    const { id, name, color, cardColor } = column;

    const { setNodeRef: setDroppableNodeRef } = useDroppable({
        id,
        data: { type: "Column" },
    });

    const {
        setNodeRef: setSortableNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, data: { type: "Column" } });

    const dynamicStyle = {
        transition: isDragging ? transition : 'all 0.2s ease-out',
        transform: CSS.Transform.toString(transform),
        backgroundColor: color || "#F8FAFC",
        opacity: isDragging ? 0.7 : 1,
    };

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState(name);

    const handleTitleBlur = () => {
        if (newTitle.trim() !== "" && newTitle.trim() !== name) {
            onEditColumn(id, newTitle.trim());
        }
        setIsEditingTitle(false);
    };

    return (
        <section
            ref={(node) => {
                setDroppableNodeRef(node);
                setSortableNodeRef(node);
            }}
            style={dynamicStyle}
            {...attributes}
            className={`w-[300px] flex flex-col flex-shrink-0 h-full rounded-xl shadow-sm transition-all duration-200 ${isDragging ? "shadow-xl scale-[1.02]" : ""
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-neutral-200/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                        {...listeners}
                        className="cursor-grab text-neutral-500 hover:text-neutral-800 transition-colors active:cursor-grabbing"
                    >
                        <GripVertical size={18} />
                    </button>

                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleTitleBlur();
                                if (e.key === "Escape") {
                                    setNewTitle(name);
                                    setIsEditingTitle(false);
                                }
                            }}
                            className="flex-1 px-2 py-1 text-sm font-semibold bg-white/50 border border-neutral-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-neutral-900"
                            autoFocus
                        />
                    ) : (
                        <h2
                            className="text-sm font-semibold text-neutral-800 cursor-pointer hover:text-black line-clamp-2 break-words"
                            onDoubleClick={() => setIsEditingTitle(true)}
                        >
                            {name}
                        </h2>
                    )}

                    <span className="text-xs text-neutral-500 ml-1">
                        ({tasks.length})
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-black/5 text-neutral-500 hover:text-neutral-800 transition-colors">
                                <Palette size={15} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white dark:bg-neutral-800">
                            <div className="grid grid-cols-3 gap-2 p-2">
                                {COLUMN_COLORS.map((pair) => (
                                    <DropdownMenuItem
                                        key={pair.column}
                                        onSelect={() => onColorChange(id, pair.column, pair.card)}
                                        className="w-8 h-8 rounded-full cursor-pointer p-0 flex items-center justify-center"
                                        style={{ backgroundColor: pair.column }}
                                    />
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                        onClick={() => onAddTask(id)}
                        className="p-1.5 rounded-lg hover:bg-black/5 text-neutral-500 hover:text-neutral-800 transition-colors"
                        title="Agregar tarea"
                    >
                        <Plus size={15} />
                    </button>

                    <button
                        onClick={() => onDeleteColumn(id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-neutral-500 hover:text-red-600 transition-colors"
                        title="Eliminar columna"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                <SortableContext items={tasks.map((t) => t.id)}>
                    {tasks.map((task) => (
                        <Task
                            key={task.id}
                            task={task}
                            onClick={onTaskClick}
                            cardColor={cardColor || "#FFFFFF"}
                            isCollapsed={collapsedTasks.has(task.id)}
                            onToggleCollapse={onToggleCollapse}
                            isActive={activeTaskId === task.id}
                        />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="text-center py-8 text-neutral-500 text-sm">
                        Sin tareas
                    </div>
                )}
            </div>
        </section>
    );
}
