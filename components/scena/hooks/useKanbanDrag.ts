import { useCallback, useRef, useState } from "react";
import { Active, DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { FetchedTask, FetchedColumn } from "@/types/scena";

interface UseKanbanDragProps {
    tasks: FetchedTask[];
    setTasks: (newTasks: FetchedTask[] | ((prev: FetchedTask[]) => FetchedTask[])) => void;
    projectId: string;
    mutate: () => Promise<void>;
    columns: FetchedColumn[];
    setColumns: (cols: FetchedColumn[] | ((prev: FetchedColumn[]) => FetchedColumn[])) => void;
}

export function useKanbanDrag({ tasks, setTasks, projectId, mutate, columns, setColumns }: UseKanbanDragProps) {
    const [activeItem, setActiveItem] = useState<Active | null>(null);

    const dragStartColumnRef = useRef<string | null>(null);
    const dragInitialTaskRef = useRef<FetchedTask | null>(null);

    const onDragStart = useCallback((event: DragStartEvent) => {
        setActiveItem(event.active);

        if (event.active.data.current?.type === "Task") {
            const task = tasks.find(t => t.id === event.active.id);
            if (task) {
                dragStartColumnRef.current = task.columnId;
                dragInitialTaskRef.current = { ...task };
            }
        }
    }, [tasks]);

    const onDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();
        if (activeId === overId) return;

        const isActiveATask = active.data.current?.type === "Task";
        const isOverATask = over.data.current?.type === "Task";
        const isOverAColumn = over.data.current?.type === "Column";

        if (!isActiveATask) return;

        setTasks((prevTasks) => {
            const activeTask = prevTasks.find((t) => t.id === activeId);
            if (!activeTask) return prevTasks;

            let newColumnId = activeTask.columnId;
            let newOrder = activeTask.order;

            if (isOverATask) {
                const overTask = prevTasks.find((t) => t.id === overId);
                if (overTask) newColumnId = overTask.columnId;
            } else if (isOverAColumn) {
                newColumnId = overId;
            }

            const tasksInTargetColumn = prevTasks.filter(t => t.columnId === newColumnId && t.id !== activeId)
                .sort((a, b) => a.order - b.order);

            if (isOverATask) {
                const overTaskIndex = tasksInTargetColumn.findIndex(t => t.id === overId);
                if (overTaskIndex !== -1) {
                    newOrder = tasksInTargetColumn[overTaskIndex].order;
                }
            } else {
                newOrder = tasksInTargetColumn.length > 0
                    ? tasksInTargetColumn[tasksInTargetColumn.length - 1].order + 1
                    : 0;
            }

            const getAllDescendantIds = (taskId: string, taskList: FetchedTask[]): string[] => {
                const descendants: string[] = [];
                const children = taskList.filter(t => t.parentId === taskId);
                children.forEach(child => {
                    descendants.push(child.id);
                    descendants.push(...getAllDescendantIds(child.id, taskList));
                });
                return descendants;
            };

            const descendantIds = getAllDescendantIds(activeId, prevTasks);

            return prevTasks.map(t => {
                if (t.id === activeId) {
                    return {
                        ...t,
                        columnId: newColumnId,
                        order: newOrder,
                    };
                }
                if (descendantIds.includes(t.id)) {
                    return { ...t, columnId: newColumnId };
                }
                return t;
            });
        });
    }, [setTasks]);

    const onDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) {
            mutate();
            dragStartColumnRef.current = null;
            return;
        }

        const activeId = active.id.toString();
        const overId = over.id.toString();

        const isActiveATask = active.data.current?.type === "Task";
        const isActiveAColumn = active.data.current?.type === "Column";

        if (isActiveATask) {
            const activeTask = tasks.find((task) => task.id === activeId);
            if (!activeTask) {
                dragStartColumnRef.current = null;
                return;
            }

            let targetColumnId = activeTask.columnId;
            let targetOrder = activeTask.order;

            const isOverATask = over.data.current?.type === "Task";
            const isOverAColumn = over.data.current?.type === "Column";

            if (isOverATask) {
                const overTask = tasks.find((t) => t.id === overId);
                if (overTask) {
                    targetColumnId = overTask.columnId;
                    const tasksInColumn = tasks
                        .filter(t => t.columnId === targetColumnId && t.id !== activeId)
                        .sort((a, b) => a.order - b.order);
                    const overIndex = tasksInColumn.findIndex(t => t.id === overId);
                    targetOrder = overIndex !== -1 ? tasksInColumn[overIndex].order : 0;
                }
            } else if (isOverAColumn) {
                targetColumnId = overId;
                const tasksInColumn = tasks
                    .filter(t => t.columnId === targetColumnId && t.id !== activeId)
                    .sort((a, b) => a.order - b.order);
                targetOrder = tasksInColumn.length > 0
                    ? tasksInColumn[tasksInColumn.length - 1].order + 1
                    : 0;
            }

            const hasColumnChanged = dragStartColumnRef.current && targetColumnId !== dragStartColumnRef.current;

            if (activeId === overId) {
                dragStartColumnRef.current = null;
                return;
            }

            // Create new tasks state for Optimistic SWR Update
            const newTasks = tasks.map(t => {
                if (t.id === activeId) {
                    return { ...t, columnId: targetColumnId, order: targetOrder };
                }
                // We should also reorder other tasks if needed, but for the cache 
                // simply updating the moved task is often enough to prevent the major "jump"
                // Ideally, we should replicate the full reorder logic here, 
                // but since setTasks is already handling the visual part (via onDragOver updates usually),
                // we technically just need to make sure SWR doesn't revert it.
                // However, 'tasks' here is the state *at the start of drag* or current?
                // 'tasks' from props comes from useKanbanData -> SWR/State.
                // 'onDragEnd' uses the 'tasks' closed over or dependency? 
                // It has [tasks] as dependency.
                return t;
            });

            // ACTUALLY: The best way is to use the *current* tasks state which is already
            // being updated by onDragOver/setTasks logic? 
            // `onDragOver` updates `setTasks`. 
            // So `tasks` in `onDragEnd` might be the updated state if the component re-rendered?
            // Yes, `onDragEnd` depends on `tasks`.

            // So we can just mutate the current `tasks` into the cache!
            // But wait, `active` and `over` calculations are based on the *latest* drag event.
            // The `tasks` array in the scope might be slightly behind if high-frequency?
            // No, React handles this.

            // Let's manually reconstruct the final valid state to be safe and update SWR.
            const updatedTasks = tasks.map(t => {
                if (t.id === activeId) {
                    return { ...t, columnId: targetColumnId, order: targetOrder };
                }
                return t;
            });

            // Optimistic Update: Update SWR cache immediately so useEffect doesn't revert us
            await mutate(updatedTasks, false);
            setTasks(updatedTasks); // Ensure local state is also set (redundancy is fine)

            try {
                const payload = {
                    columnId: targetColumnId,
                    order: targetOrder
                };

                const response = await fetch(`/api/scena/projects/${projectId}/tasks/${activeId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    // Revalidate on error
                    mutate();
                }
                // On success, we don't need to do anything because we already updated the cache!
                // Optionally we can revalidate quietly: mutate(); to allow server side side-effects (like updated timestamps)

            } catch (error) {
                console.error("Error in drag end:", error);
                mutate();
            }
        }

        else if (isActiveAColumn) {
            if (activeId !== overId) {
                const oldIndex = columns.findIndex(c => c.id === activeId);
                const newIndex = columns.findIndex(c => c.id === overId);

                const newColumns = arrayMove(columns, oldIndex, newIndex);

                // Optimistic update
                setColumns(newColumns.map((col, index) => ({ ...col, order: index })));

                try {
                    await fetch(`/api/scena/projects/${projectId}/columns/reorder`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            items: newColumns.map((col, index) => ({ id: col.id, order: index }))
                        })
                    });
                } catch (error) {
                    console.error("Error reordering columns:", error);
                    mutate();
                }
            }
        }

        dragStartColumnRef.current = null;
        dragInitialTaskRef.current = null;
    }, [tasks, projectId, mutate, columns, setColumns]);

    return {
        activeItem,
        onDragStart,
        onDragOver,
        onDragEnd,
    };
}
