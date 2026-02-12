import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { FetchedColumn, FetchedTask } from "@/types/scena";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
};

export function useKanbanData(projectId: string) {
    const { data: fetchedColumns, error: columnsError, mutate: mutateColumns } = useSWR<FetchedColumn[]>(
        `/api/scena/projects/${projectId}/columns`,
        fetcher,
        {
            revalidateOnFocus: true, // Update when window gets focus
            revalidateOnReconnect: true,
            refreshInterval: 3000, // Poll every 3 seconds for near real-time updates
        }
    );

    const { data: fetchedTasks, error: tasksError, mutate: mutateTasks } = useSWR<FetchedTask[]>(
        `/api/scena/projects/${projectId}/tasks`,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshInterval: 3000,
        }
    );

    // Optimized setters that update SWR cache immediately without revalidation
    const setColumns = useCallback((newColumns: FetchedColumn[] | ((prev: FetchedColumn[]) => FetchedColumn[])) => {
        if (typeof newColumns === 'function') {
            return mutateColumns((prev) => newColumns(prev || []), { revalidate: false });
        }
        return mutateColumns(newColumns, { revalidate: false });
    }, [mutateColumns]);

    const setTasks = useCallback((newTasks: FetchedTask[] | ((prev: FetchedTask[]) => FetchedTask[])) => {
        if (typeof newTasks === 'function') {
            return mutateTasks((prev) => newTasks(prev || []), { revalidate: false });
        }
        return mutateTasks(newTasks, { revalidate: false });
    }, [mutateTasks]);

    // Combined mutate function for final sync
    const mutate = useCallback(async () => {
        await Promise.all([mutateColumns(), mutateTasks()]);
    }, [mutateColumns, mutateTasks]);

    const tasks = fetchedTasks || [];
    const columns = fetchedColumns || [];

    // Reconstruct hierarchy from LOCAL tasks state for KANBAN (Strict Column Matching)
    const processedData = useMemo(() => {
        const safeTasks = tasks || [];
        const taskMap = new Map<string, FetchedTask>();
        safeTasks.forEach(t => taskMap.set(t.id, { ...t, children: [] }));

        // Calculate levels (same as before)
        const calculateLevel = (taskId: string, visited: Set<string> = new Set()): number => {
            if (visited.has(taskId)) return 0;
            visited.add(taskId);
            const task = taskMap.get(taskId);
            if (!task || !task.parentId) return 0;
            return 1 + calculateLevel(task.parentId, visited);
        };

        safeTasks.forEach(t => {
            const task = taskMap.get(t.id);
            if (task) task.level = calculateLevel(t.id);
        });

        // Build Tree for KANBAN (Children must be in same column)
        const rootTasks: FetchedTask[] = [];
        const sortedRawTasks = [...safeTasks].sort((a, b) => a.order - b.order);

        sortedRawTasks.forEach(t => {
            const task = taskMap.get(t.id);
            if (!task) return;
            const parent = t.parentId ? taskMap.get(t.parentId) : null;

            // Kanban Rule: Only nest if in same column
            if (parent && parent.columnId === t.columnId) {
                parent.children = parent.children || [];
                parent.children.push(task);
            } else {
                rootTasks.push(task);
            }
        });

        const generateSortKey = (task: FetchedTask, prefix: string) => {
            const orderStr = (task.order || 0).toString().padStart(6, '0');
            const currentKey = prefix ? `${prefix}.${orderStr}` : orderStr;
            task.sortKey = currentKey;
            if (task.children && task.children.length > 0) {
                task.children.sort((a, b) => a.order - b.order);
                task.children.forEach(child => generateSortKey(child, currentKey));
            }
        };

        rootTasks.sort((a, b) => a.order - b.order);
        rootTasks.forEach(root => generateSortKey(root, ""));

        return Array.from(taskMap.values());
    }, [tasks]);

    // NEW: Reconstruct hierarchy for GANTT (Ignore Column Matching)
    const ganttTasks = useMemo(() => {
        const safeTasks = tasks || [];
        // Deep copy to avoid mutating the same objects used in processedData if references overlap
        // (Though mapped objects in processedData helps, a fresh map is safer)
        const taskMap = new Map<string, FetchedTask>();
        safeTasks.forEach(t => taskMap.set(t.id, { ...t, children: [] }));

        // Calculate levels
        const calculateLevel = (taskId: string, visited: Set<string> = new Set()): number => {
            if (visited.has(taskId)) return 0;
            visited.add(taskId);
            const task = taskMap.get(taskId);
            if (!task || !task.parentId) return 0;
            return 1 + calculateLevel(task.parentId, visited);
        };

        safeTasks.forEach(t => {
            const task = taskMap.get(t.id);
            if (task) task.level = calculateLevel(t.id);
        });

        const rootTasks: FetchedTask[] = [];
        const sortedRawTasks = [...safeTasks].sort((a, b) => a.order - b.order);

        sortedRawTasks.forEach(t => {
            const task = taskMap.get(t.id);
            if (!task) return;
            const parent = t.parentId ? taskMap.get(t.parentId) : null;

            // Gantt Rule: Always nest if parent exists (hierarchy > status)
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(task);
            } else {
                rootTasks.push(task);
            }
        });

        // Use same sort key logic if needed, or primarily index-based 
        // Gantt chart usually flattens based on recursion anyway.

        // We return the tasks. The GanttChart component will flatten them starting from roots.
        // However, GanttChart receives a flat array and rebuilds? 
        // No, GanttChart receives `tasks` and iterates roots. 
        // But `tasks` in GanttChart prop type is `GanttTask[]`.
        // We need to return ALL tasks, but with `children` populated correctly.

        return Array.from(taskMap.values());
    }, [tasks]);

    return {
        columns,
        setColumns,
        tasks,
        setTasks,
        processedData,
        ganttTasks, // <--- New
        mutate,
        isLoading: (!fetchedColumns && !columnsError) || (!fetchedTasks && !tasksError),
        errors: { columnsError, tasksError }
    };
}
