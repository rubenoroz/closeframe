"use client";
import React from "react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { Column } from "./Column";
import { Task } from "./Task";
import { Plus } from "lucide-react";
import { FetchedColumn, FetchedTask } from "@/types/scena";

interface KanbanViewProps {
    columns: FetchedColumn[];
    visibleTasks: FetchedTask[];
    columnsId: string[];
    sensors: any;
    onDragStart: (event: DragStartEvent) => void;
    onDragOver: (event: DragOverEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onAddTask: (columnId: string) => void;
    onEditColumn: (columnId: string, name: string) => void;
    onDeleteColumn: (columnId: string) => void;
    onTaskClick: (taskId: string) => void;
    onColorChange: (columnId: string, color: string, cardColor: string) => void;
    collapsedTasks: Set<string>;
    onToggleCollapse: (taskId: string) => void;
    activeItem: any;
    activeTaskContent: FetchedTask | null | undefined;
    onAddColumn: () => void;
}

export function KanbanView({
    columns,
    visibleTasks,
    columnsId,
    sensors,
    onDragStart,
    onDragOver,
    onDragEnd,
    onAddTask,
    onEditColumn,
    onDeleteColumn,
    onTaskClick,
    onColorChange,
    collapsedTasks,
    onToggleCollapse,
    activeItem,
    activeTaskContent,
    onAddColumn
}: KanbanViewProps) {
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
            <div className="h-full overflow-x-auto">
                <div className="flex h-full gap-4 pb-4 min-w-fit">
                    <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                        {columns.map((col) => {
                            const columnTasks = visibleTasks
                                .filter(task => task.columnId === col.id)
                                .sort((a, b) => (a.sortKey || "").localeCompare(b.sortKey || ""));

                            return (
                                <Column
                                    key={col.id}
                                    column={col}
                                    tasks={columnTasks}
                                    onAddTask={onAddTask}
                                    onEditColumn={onEditColumn}
                                    onDeleteColumn={onDeleteColumn}
                                    onTaskClick={onTaskClick}
                                    onColorChange={onColorChange}
                                    collapsedTasks={collapsedTasks}
                                    onToggleCollapse={onToggleCollapse}
                                    activeTaskId={activeItem?.id as string}
                                />
                            );
                        })}
                    </SortableContext>

                    <button
                        className="w-[300px] h-[60px] rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 flex items-center justify-center text-neutral-500 transition-colors shrink-0"
                        onClick={onAddColumn}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Columna
                    </button>
                    <div className="w-4 shrink-0" />
                </div>
            </div>

            {typeof document !== 'undefined' && createPortal(
                <DragOverlay>
                    {activeItem && activeItem.data.current?.type === "Task" && activeTaskContent && (
                        <Task
                            task={activeTaskContent}
                            onClick={() => { }}
                            isActive
                        />
                    )}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
