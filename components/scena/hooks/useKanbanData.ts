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
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 30000,
        }
    );

    const { data: fetchedTasks, error: tasksError, mutate: mutateTasks } = useSWR<FetchedTask[]>(
        `/api/scena/projects/${projectId}/tasks`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 30000,
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

    // Reconstruct hierarchy from LOCAL tasks state
    const processedData = useMemo(() => {
        const safeTasks = tasks || [];

        // Create a map of tasks by ID for easy lookup
        const taskMap = new Map<string, FetchedTask>();
        safeTasks.forEach(t => {
            taskMap.set(t.id, { ...t, children: [] });
        });

        // Calculate level for EVERY task based on parentId chain
        const calculateLevel = (taskId: string, visited: Set<string> = new Set()): number => {
            if (visited.has(taskId)) return 0;
            visited.add(taskId);

            const task = taskMap.get(taskId);
            if (!task || !task.parentId) return 0;

            const parent = taskMap.get(task.parentId);
            if (!parent) return 0;

            return 1 + calculateLevel(task.parentId, visited);
        };

        // Apply calculated levels to all tasks
        safeTasks.forEach(t => {
            const task = taskMap.get(t.id);
            if (task) {
                task.level = calculateLevel(t.id);
            }
        });

        // Build the tree structure for visual rendering (same-column children only)
        const rootTasks: FetchedTask[] = [];
        const sortedRawTasks = [...safeTasks].sort((a, b) => a.order - b.order);

        sortedRawTasks.forEach(t => {
            const task = taskMap.get(t.id);
            if (!task) return;

            // Link as child ONLY if both are in the same column
            const parent = t.parentId ? taskMap.get(t.parentId) : null;
            if (parent && parent.columnId === t.columnId) {
                parent.children = parent.children || [];
                parent.children.push(task);
            } else {
                rootTasks.push(task);
            }
        });

        // Generate sortKey for proper ordering
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

    return {
        columns,
        setColumns,
        tasks,
        setTasks,
        processedData,
        mutate,
        isLoading: (!fetchedColumns && !columnsError) || (!fetchedTasks && !tasksError),
        errors: { columnsError, tasksError }
    };
}
