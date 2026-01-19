"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";

interface GanttTask {
    id: string;
    title: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    toleranceDate?: Date | string | null;
    parentId?: string | null;
    children?: GanttTask[];
    columnId: string;
    isHiddenInGantt?: boolean;
    level?: number;
}

interface GanttChartProps {
    tasks: GanttTask[];
    columns: { id: string; name: string; color?: string | null }[];
    projectId: string;
    onTaskClick: (taskId: string) => void;
    onOptimisticUpdate?: (taskId: string, updates: Record<string, unknown>) => void;
    visibleTasks?: GanttTask[];
}

export function GanttChart({ tasks, columns, projectId, onTaskClick, onOptimisticUpdate, visibleTasks }: GanttChartProps) {
    const [resizing, setResizing] = useState<{ taskId: string; edge: 'start' | 'end' | 'tolerance'; newDate: string | null } | null>(null);
    const [previewDates, setPreviewDates] = useState<Record<string, { startDate?: string; endDate?: string; toleranceDate?: string }>>({});
    const timelineRef = useRef<HTMLDivElement>(null);
    const timelineTrackRef = useRef<HTMLDivElement>(null);

    // Filter out tasks that should be hidden in Gantt
    const ganttVisibleTasks = useMemo(() => {
        const sourceTasks = visibleTasks || tasks;
        return sourceTasks.filter(task => !task.isHiddenInGantt);
    }, [tasks, visibleTasks]);

    // Filter tasks that have dates
    const tasksWithDates = useMemo(() => {
        return ganttVisibleTasks.filter(task => task.startDate && task.endDate);
    }, [ganttVisibleTasks]);

    // Calculate date range for the project
    const dateRange = useMemo(() => {
        if (tasksWithDates.length === 0) {
            const today = new Date();
            return {
                start: new Date(today.getFullYear(), today.getMonth(), 1),
                end: new Date(today.getFullYear(), today.getMonth() + 3, 0),
            };
        }

        const dates = tasksWithDates.flatMap(task => [
            new Date(task.startDate as string),
            new Date(task.endDate as string),
            task.toleranceDate ? new Date(task.toleranceDate as string) : null,
        ].filter(Boolean) as Date[]);

        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 7);

        return { start: minDate, end: maxDate };
    }, [tasksWithDates]);

    // Generate month headers
    const months = useMemo(() => {
        const result: { label: string; days: number }[] = [];
        const current = new Date(dateRange.start);

        while (current <= dateRange.end) {
            const year = current.getFullYear();
            const month = current.getMonth();
            const monthEnd = new Date(year, month + 1, 0);

            const daysInMonth = monthEnd.getDate();
            result.push({
                label: current.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
                days: daysInMonth,
            });

            current.setMonth(current.getMonth() + 1);
        }

        return result;
    }, [dateRange]);

    const totalDays = useMemo(() => {
        return Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    }, [dateRange]);

    // Generate all individual days for the timeline
    const allDays = useMemo(() => {
        const days: { date: Date; dayOfMonth: number; isWeekend: boolean; isToday: boolean }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const current = new Date(dateRange.start);
        current.setHours(0, 0, 0, 0);

        while (current <= dateRange.end) {
            days.push({
                date: new Date(current),
                dayOfMonth: current.getDate(),
                isWeekend: current.getDay() === 0 || current.getDay() === 6,
                isToday: current.getTime() === today.getTime(),
            });
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [dateRange]);

    const getTaskBarStyle = (task: GanttTask) => {
        if (!task.startDate || !task.endDate) return null;

        const preview = previewDates[task.id];
        const startDate = preview?.startDate || task.startDate;
        const endDate = preview?.endDate || task.endDate;

        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate as string);
        end.setHours(0, 0, 0, 0);
        const rangeStart = new Date(dateRange.start);
        rangeStart.setHours(0, 0, 0, 0);

        // Use allDays.length for precise alignment with rendered day cells
        const daysCount = allDays.length || totalDays;
        const startOffset = Math.floor((start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const leftPercent = (startOffset / daysCount) * 100;
        const widthPercent = (duration / daysCount) * 100;

        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
        };
    };

    const getDateFromMousePosition = (clientX: number) => {
        if (!timelineTrackRef.current) return null;

        const rect = timelineTrackRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const percentX = relativeX / rect.width;
        const dayOffset = Math.round(percentX * totalDays);

        const newDate = new Date(dateRange.start);
        newDate.setDate(newDate.getDate() + dayOffset);

        return newDate;
    };

    const handleMouseDown = (e: React.MouseEvent, taskId: string, edge: 'start' | 'end' | 'tolerance') => {
        e.stopPropagation();
        setResizing({ taskId, edge, newDate: null });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizing) return;

        const newDate = getDateFromMousePosition(e.clientX);
        if (!newDate) return;

        const task = tasksWithDates.find(t => t.id === resizing.taskId);
        if (!task) return;

        const dateString = newDate.toISOString().split('T')[0];

        if (resizing.edge === 'start' && task.endDate) {
            const endDate = new Date(task.endDate as string);
            if (newDate >= endDate) return;
        } else if (resizing.edge === 'end' && task.startDate) {
            const startDate = new Date(task.startDate as string);
            if (newDate <= startDate) return;
        }

        const fieldName = resizing.edge === 'start' ? 'startDate' :
            resizing.edge === 'end' ? 'endDate' : 'toleranceDate';

        setPreviewDates(prev => ({
            ...prev,
            [resizing.taskId]: {
                ...prev[resizing.taskId],
                [fieldName]: dateString,
            }
        }));

        setResizing({ ...resizing, newDate: dateString });
    };

    const handleMouseUp = async () => {
        if (!resizing || !resizing.newDate) {
            setResizing(null);
            setPreviewDates({});
            return;
        }

        const task = tasksWithDates.find(t => t.id === resizing.taskId);
        if (!task) {
            setResizing(null);
            setPreviewDates({});
            return;
        }

        const fieldName = resizing.edge === 'start' ? 'startDate' :
            resizing.edge === 'end' ? 'endDate' : 'toleranceDate';

        const savedDate = resizing.newDate;
        const savedTaskId = resizing.taskId;

        // Clear resizing state but keep preview until API completes
        setResizing(null);

        try {
            const response = await fetch(`/api/scena/projects/${projectId}/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [fieldName]: savedDate,
                }),
            });

            if (response.ok) {
                // Apply optimistic update before clearing preview
                if (onOptimisticUpdate) {
                    onOptimisticUpdate(savedTaskId, { [fieldName]: savedDate });
                }
            }
        } catch (error) {
            console.error('Error updating task date:', error);
        } finally {
            // Small delay to let the optimistic update take effect before clearing preview
            setTimeout(() => {
                setPreviewDates(prev => {
                    const newPreviews = { ...prev };
                    delete newPreviews[savedTaskId];
                    return newPreviews;
                });
            }, 100);
        }
    };

    useEffect(() => {
        if (resizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizing]);

    // Flatten tasks with hierarchy info
    const flatTasks = useMemo(() => {
        const result: (GanttTask & { level: number })[] = [];
        const taskMap = new Map(tasksWithDates.map(t => [t.id, t]));
        const processedIds = new Set<string>();

        const flatten = (task: GanttTask, level: number) => {
            if (processedIds.has(task.id)) return;
            processedIds.add(task.id);

            result.push({ ...task, level });
            if (task.children) {
                task.children.forEach(childRef => {
                    const childTask = taskMap.get(childRef.id);
                    if (childTask) {
                        flatten(childTask, level + 1);
                    }
                });
            }
        };

        const roots = tasksWithDates.filter(task =>
            !task.parentId || !taskMap.has(task.parentId)
        );

        roots.forEach(task => flatten(task, 0));

        return result;
    }, [tasksWithDates]);

    if (tasksWithDates.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <div className="text-center p-8">
                    <p className="text-neutral-500 text-lg mb-2">No hay tareas con fechas configuradas</p>
                    <p className="text-neutral-400 text-sm">Agrega fechas de inicio y fin a tus tareas para verlas en el Gantt</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {/* Timeline Header - Months */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                <div className="w-64 flex-shrink-0 p-2 font-semibold text-neutral-700 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-700 text-sm">
                    Tarea
                </div>
                <div className="flex-1 flex">
                    {months.map((month, idx) => (
                        <div
                            key={idx}
                            className="p-2 text-center font-semibold text-neutral-700 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-700 last:border-r-0 text-sm"
                            style={{ width: `${(month.days / totalDays) * 100}%` }}
                        >
                            {month.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline Header - Days */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/70">
                <div className="w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700" />
                <div className="flex-1 flex" ref={timelineTrackRef}>
                    {allDays.map((day, idx) => {
                        // Spanish weekday initials: L, M, X, J, V, S, D
                        const weekdayInitials = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
                        const weekdayInitial = weekdayInitials[day.date.getDay()];

                        return (
                            <div
                                key={idx}
                                className={`flex-1 min-w-[24px] text-center py-0.5 border-r border-neutral-200/50 dark:border-neutral-700/50 flex flex-col
                                    ${day.isToday ? 'bg-emerald-500 text-white font-bold' : ''}
                                    ${day.isWeekend && !day.isToday ? 'bg-neutral-200/50 dark:bg-neutral-700/50 text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'}
                                `}
                                title={day.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                            >
                                <span className="text-[8px] leading-tight">{weekdayInitial}</span>
                                <span className="text-[10px] leading-tight">{day.dayOfMonth}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto" ref={timelineRef}>
                {flatTasks.map((task) => {
                    const barStyle = getTaskBarStyle(task);
                    if (!barStyle) return null;

                    return (
                        <div
                            key={task.id}
                            className="flex border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
                        >
                            {/* Task Name */}
                            <div
                                className="w-64 flex-shrink-0 p-3 border-r border-neutral-200 dark:border-neutral-700 flex items-center cursor-pointer"
                                onClick={() => onTaskClick(task.id)}
                                style={{ paddingLeft: `${task.level * 20 + 12}px` }}
                            >
                                {task.level > 0 && (
                                    <span className="text-neutral-400 mr-2">└</span>
                                )}
                                <span className="text-sm text-neutral-700 dark:text-neutral-200 truncate hover:text-blue-600">
                                    {task.title}
                                </span>
                            </div>

                            {/* Timeline */}
                            <div className="flex-1 relative py-3 px-0">
                                {(() => {
                                    const column = columns.find(c => c.id === task.columnId);
                                    const columnColor = column?.color || '#3B82F6';

                                    return (
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 h-8 rounded shadow-sm hover:opacity-90 transition-opacity group/bar"
                                            style={{ ...barStyle, backgroundColor: columnColor }}
                                            title={`${task.title}\n${new Date(task.startDate as string).toLocaleDateString()} - ${new Date(task.endDate as string).toLocaleDateString()}`}
                                        >
                                            {/* Left resize handle */}
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black hover:bg-opacity-20 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                                onMouseDown={(e) => handleMouseDown(e, task.id, 'start')}
                                                title="Arrastrar para cambiar fecha de inicio"
                                            />

                                            {/* Task title */}
                                            <div
                                                className="h-full flex items-center justify-center text-white text-xs font-medium px-2 truncate cursor-pointer"
                                                onClick={() => onTaskClick(task.id)}
                                            >
                                                {task.title}
                                            </div>

                                            {/* Right resize handle */}
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black hover:bg-opacity-20 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                                onMouseDown={(e) => handleMouseDown(e, task.id, 'end')}
                                                title="Arrastrar para cambiar fecha de fin"
                                            />
                                        </div>
                                    );
                                })()}

                                {/* Tolerance Date Indicator */}
                                {task.toleranceDate && (
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-12 bg-red-500 opacity-70 hover:opacity-100 cursor-ew-resize transition-opacity"
                                        style={{
                                            left: `${((new Date(previewDates[task.id]?.toleranceDate || task.toleranceDate as string).getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100}%`,
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, task.id, 'tolerance')}
                                        title={`Fecha de tolerancia: ${new Date(previewDates[task.id]?.toleranceDate || task.toleranceDate as string).toLocaleDateString()}\nArrastrar para cambiar`}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-1 h-full bg-red-600" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
