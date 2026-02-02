"use client";
import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { FetchedTask } from "@/types/scena";

interface TaskDetailModalProps {
    task: FetchedTask | null;
    projectId: string;
    onClose: () => void;
    onTaskUpdate: (updatedTask?: Partial<FetchedTask>) => void;
}

export function TaskDetailModal({ task, projectId, onClose, onTaskUpdate }: TaskDetailModalProps) {
    const [mounted, setMounted] = useState(false);
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [startDate, setStartDate] = useState<string>(
        task?.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ""
    );
    const [endDate, setEndDate] = useState<string>(
        task?.endDate ? new Date(task.endDate).toISOString().split('T')[0] : ""
    );
    const [toleranceDate, setToleranceDate] = useState<string>(
        task?.toleranceDate ? new Date(task.toleranceDate).toISOString().split('T')[0] : ""
    );
    const [priority, setPriority] = useState(task?.priority || "MEDIUM");
    const [progress, setProgress] = useState(task?.progress || 0);
    const [isHiddenInGantt, setIsHiddenInGantt] = useState(task?.isHiddenInGantt || false);
    const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>(
        task?.checklist ? JSON.parse(task.checklist) : []
    );
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [subtaskTitle, setSubtaskTitle] = useState("");
    const [showSubtasks, setShowSubtasks] = useState(true);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const saveField = useCallback(async (field: string, value: any) => {
        if (!task) return;
        try {
            const response = await fetch(`/api/scena/projects/${projectId}/tasks/${task.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            if (response.ok) {
                onTaskUpdate({ [field]: value });
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
        }
    }, [task, projectId, onTaskUpdate]);

    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim() || !task) return;
        const newItem = {
            id: `check-${Date.now()}`,
            text: newChecklistItem,
            completed: false
        };
        const updatedChecklist = [...checklist, newItem];
        setChecklist(updatedChecklist);
        setNewChecklistItem("");
        await saveField("checklist", JSON.stringify(updatedChecklist));
    };

    const handleToggleChecklistItem = async (id: string) => {
        const updatedChecklist = checklist.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        setChecklist(updatedChecklist);

        // Calculate progress based on checklist
        const completed = updatedChecklist.filter(i => i.completed).length;
        const newProgress = updatedChecklist.length > 0
            ? Math.round((completed / updatedChecklist.length) * 100)
            : 0;
        setProgress(newProgress);

        await saveField("checklist", JSON.stringify(updatedChecklist));
        await saveField("progress", newProgress);
    };

    const handleDeleteChecklistItem = async (id: string) => {
        const updatedChecklist = checklist.filter(item => item.id !== id);
        setChecklist(updatedChecklist);
        await saveField("checklist", JSON.stringify(updatedChecklist));
    };

    const handleAddSubtask = async () => {
        if (!subtaskTitle.trim() || !task) return;
        try {
            const response = await fetch(`/api/scena/projects/${projectId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: subtaskTitle,
                    columnId: task.columnId,
                    parentId: task.id,
                    startDate: task.startDate,
                    endDate: task.endDate,
                }),
            });
            if (response.ok) {
                setSubtaskTitle("");
                onTaskUpdate();
            }
        } catch (error) {
            console.error("Error creating subtask:", error);
        }
    };

    const handleDeleteTask = async () => {
        if (!task || !confirm("¿Eliminar esta tarea y todas sus subtareas?")) return;
        try {
            const response = await fetch(`/api/scena/projects/${projectId}/tasks/${task.id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                onTaskUpdate();
                onClose();
            }
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    if (!task || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => title !== task.title && saveField("title", title)}
                        className="text-xl font-bold bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex-1 text-neutral-900 dark:text-white"
                        placeholder="Título de la tarea"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDeleteTask}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar tarea"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-neutral-500" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Descripción
                        </label>
                        <textarea
                            className="w-full mt-2 p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
                            placeholder="Añade una descripción..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={() => description !== task.description && saveField("description", description)}
                        />
                    </div>

                    {/* Dates */}
                    <div>
                        <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Fechas
                        </label>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                            <div>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">Inicio</span>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        saveField("startDate", e.target.value || null);
                                    }}
                                />
                            </div>
                            <div>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">Fin</span>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        saveField("endDate", e.target.value || null);
                                    }}
                                />
                            </div>
                            <div>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">Tolerancia</span>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                                    value={toleranceDate}
                                    onChange={(e) => {
                                        setToleranceDate(e.target.value);
                                        saveField("toleranceDate", e.target.value || null);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Prioridad
                        </label>
                        <div className="flex gap-2 mt-2">
                            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        setPriority(p);
                                        saveField("priority", p);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${priority === p
                                        ? p === "LOW" ? "bg-blue-500 text-white" :
                                            p === "MEDIUM" ? "bg-yellow-500 text-white" :
                                                p === "HIGH" ? "bg-orange-500 text-white" :
                                                    "bg-red-600 text-white"
                                        : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                                        }`}
                                >
                                    {p === "LOW" ? "Baja" : p === "MEDIUM" ? "Media" : p === "HIGH" ? "Alta" : "Urgente"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Progress */}
                    <div>
                        <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Progreso: {progress}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setProgress(val);
                            }}
                            onMouseUp={() => saveField("progress", progress)}
                            className="w-full mt-2 accent-blue-500"
                        />
                    </div>

                    {/* Gantt Visibility */}
                    <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {isHiddenInGantt ? "Oculta en Gantt" : "Visible en Gantt"}
                        </span>
                        <button
                            onClick={() => {
                                const newVal = !isHiddenInGantt;
                                setIsHiddenInGantt(newVal);
                                saveField("isHiddenInGantt", newVal);
                            }}
                            className={`p-2 rounded-lg transition-colors ${isHiddenInGantt
                                ? "bg-neutral-200 dark:bg-neutral-600"
                                : "bg-blue-500 text-white"
                                }`}
                        >
                            {isHiddenInGantt ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {/* Checklist */}
                    <div>
                        <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Checklist ({checklist.filter(i => i.completed).length}/{checklist.length})
                        </label>
                        <div className="mt-2 space-y-2">
                            {checklist.map((item) => (
                                <div key={item.id} className="flex items-center gap-2 group">
                                    <input
                                        type="checkbox"
                                        checked={item.completed}
                                        onChange={() => handleToggleChecklistItem(item.id)}
                                        className="w-4 h-4 rounded border-neutral-300 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className={`flex-1 text-sm ${item.completed ? "line-through text-neutral-400" : "text-neutral-700 dark:text-neutral-200"}`}>
                                        {item.text}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteChecklistItem(item.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                                    placeholder="Añadir item..."
                                    className="flex-1 p-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                                />
                                <button
                                    onClick={handleAddChecklistItem}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Subtasks */}
                    {task.children && task.children.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowSubtasks(!showSubtasks)}
                                className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                            >
                                {showSubtasks ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                Subtareas ({task.children.length})
                            </button>
                            {showSubtasks && (
                                <div className="mt-2 ml-4 space-y-1 border-l-2 border-neutral-200 dark:border-neutral-600 pl-3">
                                    {task.children.map((subtask) => (
                                        <div key={subtask.id} className="text-sm text-neutral-700 dark:text-neutral-300 py-1">
                                            • {subtask.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Add Subtask */}
                    <div>
                        <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Agregar Subtarea
                        </label>
                        <div className="flex gap-2 mt-2">
                            <input
                                type="text"
                                value={subtaskTitle}
                                onChange={(e) => setSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                                placeholder="Título de la subtarea..."
                                className="flex-1 p-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
                            />
                            <button
                                onClick={handleAddSubtask}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Cambios guardados automáticamente
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium bg-neutral-800 dark:bg-neutral-700 text-white rounded-lg hover:bg-neutral-900 dark:hover:bg-neutral-600 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
