"use client";
import React, { useCallback, useMemo, useState } from "react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useKanbanData } from "./hooks/useKanbanData";
import { useKanbanDrag } from "./hooks/useKanbanDrag";
import { Column } from "./Column";
import { Task } from "./Task";
import { TaskDetailModal } from "./TaskDetailModal";
import { GanttChart } from "./GanttChart";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, FileSpreadsheet, PieChart, Plus, Eye, EyeOff, Search, X } from "lucide-react";
import { FetchedTask } from "@/types/scena";

const ProjectStatisticsModal = dynamic(
    () => import("./ProjectStatisticsModal").then((mod) => mod.ProjectStatisticsModal),
    { ssr: false }
);

interface KanbanBoardProps {
    projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
    const {
        columns,
        setColumns,
        tasks,
        setTasks,
        processedData,
        mutate,
        isLoading,
        errors: { columnsError, tasksError }
    } = useKanbanData(projectId);

    const {
        activeItem,
        onDragStart,
        onDragOver,
        onDragEnd
    } = useKanbanDrag({
        tasks,
        setTasks,
        projectId,
        mutate,
        columns,
        setColumns // Passed here
    });

    // UI State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');
    const [showArchivedTasks, setShowArchivedTasks] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Collapsed tasks for hierarchy
    const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`collapsed-tasks-${projectId}`);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });

    const toggleTaskCollapse = useCallback((taskId: string) => {
        setCollapsedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem(`collapsed-tasks-${projectId}`, JSON.stringify(Array.from(newSet)));
            }
            return newSet;
        });
    }, [projectId]);

    const selectedTask = useMemo(() =>
        processedData.find((task) => task.id === selectedTaskId) || null,
        [processedData, selectedTaskId]
    );

    // Filter visible tasks (including search)
    const visibleTasks = useMemo(() => {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const term = searchTerm.toLowerCase().trim();

        return processedData.filter(task => {
            // Search filter
            if (term) {
                const matchesSearch =
                    task.title?.toLowerCase().includes(term) ||
                    task.description?.toLowerCase().includes(term) ||
                    task.tags?.some((tag: string) => tag.toLowerCase().includes(term));
                if (!matchesSearch) return false;
            }

            // Handle archived tasks
            if (task.isArchived) return showArchivedTasks;
            if (showArchivedTasks) return false;

            // Check collapsed parents
            if (!task.parentId) return true;

            let currentParentId: string | null | undefined = task.parentId;
            while (currentParentId) {
                if (activeItem && activeItem.id === currentParentId) return false;

                const parent = taskMap.get(currentParentId);
                if (!parent) break;

                if (collapsedTasks.has(currentParentId) && task.columnId === parent.columnId) {
                    return false;
                }
                currentParentId = parent.parentId || null;
            }
            return true;
        });
    }, [processedData, tasks, collapsedTasks, showArchivedTasks, activeItem, searchTerm]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 3 },
        })
    );

    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTaskId(null);
    };

    const handleTaskUpdate = useCallback((updatedTaskData?: Partial<FetchedTask>) => {
        if (updatedTaskData && selectedTaskId) {
            setTasks((prevTasks) =>
                prevTasks.map((t) =>
                    t.id === selectedTaskId ? { ...t, ...updatedTaskData } : t
                )
            );
        }
        mutate();
    }, [selectedTaskId, mutate, setTasks]);

    const handleGanttOptimisticUpdate = useCallback((taskId: string, updates: Record<string, unknown>) => {
        setTasks((prevTasks) =>
            prevTasks.map((t) => t.id === taskId ? { ...t, ...updates } : t)
        );
        mutate();
    }, [mutate, setTasks]);

    const handleExportExcel = async () => {
        try {
            const { exportToExcel } = await import("@/lib/excel");
            const taskMap = new Map(visibleTasks.map(t => [t.id, t]));
            const processedIds = new Set<string>();
            const exportData: any[] = [];

            const processTask = (task: FetchedTask, level: number) => {
                if (processedIds.has(task.id)) return;
                processedIds.add(task.id);
                exportData.push({ ...task, level });
                if (task.children) {
                    task.children.forEach(child => {
                        const fullChild = taskMap.get(child.id);
                        if (fullChild) processTask(fullChild, level + 1);
                    });
                }
            };

            const roots = visibleTasks.filter(t =>
                (!t.parentId || !taskMap.has(t.parentId)) && !t.isHiddenInGantt
            );
            roots.forEach(t => processTask(t, 0));

            await exportToExcel(exportData, columns, "Proyecto_Scena");
        } catch (error) {
            console.error("Failed to export excel:", error);
        }
    };

    const handleAddColumn = async () => {
        const name = prompt("Nombre de la columna:");
        if (!name) return;

        const tempId = `temp-col-${Date.now()}`;
        const tempColumn = {
            id: tempId,
            name,
            order: columns.length,
            color: '#6366f1',
            cardColor: '#ffffff',
            projectId,
            tasks: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        setColumns([...columns, tempColumn]);

        try {
            const response = await fetch(`/api/scena/projects/${projectId}/columns`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (response.ok) {
                const newColumn = await response.json();
                setColumns((prev) => prev.map(c => c.id === tempId ? newColumn : c));
            } else {
                mutate();
            }
        } catch (error) {
            console.error("Error adding column:", error);
            mutate();
        }
    };

    const handleAddTask = async (columnId: string) => {
        const title = prompt("Título de la tarea:");
        if (!title) return;

        const optimisticId = "temp-" + Date.now();
        const optimisticTask: FetchedTask = {
            id: optimisticId,
            title,
            columnId,
            order: tasks.filter(t => t.columnId === columnId).length,
            createdAt: new Date(),
            updatedAt: new Date(),
            progress: 0,
            isHiddenInGantt: false,
            description: null,
            startDate: null,
            endDate: null,
            toleranceDate: null,
            color: null,
            links: null,
            attachments: null,
            images: null,
            tags: null,
            priority: "MEDIUM",
            checklist: null,
            parentId: null
        };

        setTasks(prev => [...prev, optimisticTask]);

        try {
            await fetch(`/api/scena/projects/${projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, columnId })
            });
            mutate();
        } catch (err) {
            console.error(err);
            mutate();
        }
    };

    const handleEditColumn = async (columnId: string, name: string) => {
        setColumns(prev => prev.map(c => c.id === columnId ? { ...c, name } : c));
        await fetch(`/api/scena/projects/${projectId}/columns/${columnId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        mutate();
    };

    const handleDeleteColumn = async (columnId: string) => {
        if (!confirm("¿Eliminar columna y sus tareas?")) return;
        setColumns(prev => prev.filter(c => c.id !== columnId));
        await fetch(`/api/scena/projects/${projectId}/columns/${columnId}`, {
            method: 'DELETE'
        });
        mutate();
    };

    const handleColorChange = async (columnId: string, color: string, cardColor: string) => {
        setColumns(prev => prev.map(c => c.id === columnId ? { ...c, color, cardColor } : c));
        await fetch(`/api/scena/projects/${projectId}/columns/${columnId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ color, cardColor })
        });
    };

    if (columnsError || tasksError) {
        return <div className="text-red-500 p-4">Error cargando el tablero.</div>;
    }

    if (isLoading && columns.length === 0) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    const activeTaskContent = activeItem?.data.current?.type === "Task"
        ? processedData.find(t => t.id === activeItem.id)
        : null;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search Bar */}
                    <div className="flex items-center px-3 py-2 rounded-lg border bg-neutral-800 border-neutral-700 focus-within:border-emerald-500 transition-all w-full sm:w-auto sm:min-w-[200px]">
                        <Search className="w-4 h-4 text-neutral-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar tarea..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-500 text-white"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")}>
                                <X className="w-3 h-3 text-neutral-500 hover:text-neutral-300" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setViewMode(viewMode === 'kanban' ? 'gantt' : 'kanban')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'gantt'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600 border border-neutral-600'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">{viewMode === 'kanban' ? 'Gantt' : 'Kanban'}</span>
                    </button>

                    <button
                        onClick={() => setShowArchivedTasks(!showArchivedTasks)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${showArchivedTasks
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-neutral-700 text-neutral-100 hover:bg-neutral-600 border border-neutral-600'
                            }`}
                    >
                        {showArchivedTasks ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span className="hidden sm:inline">{showArchivedTasks ? "Activas" : "Archivadas"}</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {viewMode === 'gantt' && (
                        <button
                            onClick={handleExportExcel}
                            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-neutral-700 text-neutral-100 hover:bg-neutral-600 border border-neutral-600 transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span className="hidden sm:inline">Exportar Excel</span>
                        </button>
                    )}

                    <button
                        onClick={() => setIsStatsModalOpen(true)}
                        className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-neutral-700 text-neutral-100 hover:bg-neutral-600 border border-neutral-600 transition-all"
                    >
                        <PieChart className="w-4 h-4" />
                        <span className="hidden sm:inline">Estadísticas</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'kanban' ? (
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
                                                onAddTask={handleAddTask}
                                                onEditColumn={handleEditColumn}
                                                onDeleteColumn={handleDeleteColumn}
                                                onTaskClick={handleTaskClick}
                                                onColorChange={handleColorChange}
                                                collapsedTasks={collapsedTasks}
                                                onToggleCollapse={toggleTaskCollapse}
                                                activeTaskId={activeItem?.id as string}
                                            />
                                        );
                                    })}
                                </SortableContext>

                                <button
                                    className="w-[300px] h-[60px] rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 flex items-center justify-center text-neutral-500 transition-colors shrink-0"
                                    onClick={handleAddColumn}
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
                ) : (
                    <div className="h-full">
                        <GanttChart
                            tasks={processedData}
                            columns={columns}
                            projectId={projectId}
                            onTaskClick={handleTaskClick}
                            onOptimisticUpdate={handleGanttOptimisticUpdate}
                            visibleTasks={visibleTasks}
                        />
                    </div>
                )}
            </div>

            {/* Modals */}
            <ProjectStatisticsModal
                isOpen={isStatsModalOpen}
                onClose={() => setIsStatsModalOpen(false)}
                tasks={tasks}
                columns={columns}
            />

            {selectedTask && isModalOpen && (
                <TaskDetailModal
                    key={selectedTask.id}
                    task={selectedTask}
                    projectId={projectId}
                    onClose={handleCloseModal}
                    onTaskUpdate={handleTaskUpdate}
                />
            )}
        </div>
    );
}
