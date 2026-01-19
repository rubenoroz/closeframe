"use client";
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { X, List, CheckCircle2, BarChart3 } from 'lucide-react';

interface ProjectStatisticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: any[];
    columns?: any[];
}

const COLORS = {
    completed: '#22c55e',
    inProgress: '#3b82f6',
    notStarted: '#94a3b8',
};

export function ProjectStatisticsModal({ isOpen, onClose, tasks, columns = [] }: ProjectStatisticsModalProps) {
    const [viewMode, setViewMode] = useState<'status' | 'list_distribution' | 'list_performance'>('status');

    if (!isOpen) return null;

    // Filter for subtasks (tasks that have a parentId)
    const subtasks = tasks.filter(task => task.parentId);
    const totalSubtasks = subtasks.length;

    if (totalSubtasks === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-white mb-4">Estadísticas del Proyecto</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">No hay subtareas para analizar aún.</p>
                </div>
            </div>
        );
    }

    // By Status
    const completed = subtasks.filter(t => (t.progress || 0) === 100).length;
    const notStarted = subtasks.filter(t => (t.progress || 0) === 0).length;
    const inProgress = totalSubtasks - completed - notStarted;

    const dataByStatus = [
        { name: 'Completadas', value: completed, color: COLORS.completed },
        { name: 'En Progreso', value: inProgress, color: COLORS.inProgress },
        { name: 'Sin Iniciar', value: notStarted, color: COLORS.notStarted },
    ].filter(item => item.value > 0);

    // By List (Column)
    const dataByList = columns.map(col => {
        const tasksInCol = subtasks.filter(t => t.columnId === col.id);
        const count = tasksInCol.length;

        const totalProgress = tasksInCol.reduce((sum: number, t: any) => sum + (t.progress || 0), 0);
        const avgProgress = count > 0 ? Math.round(totalProgress / count) : 0;

        return {
            name: col.name,
            value: count,
            avgProgress: avgProgress,
            color: col.color || '#cbd5e1',
            taskCount: count
        };
    }).filter(item => viewMode === 'list_performance' ? true : item.value > 0);

    const activeData = viewMode === 'status' ? dataByStatus : dataByList;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-3xl p-6 relative animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 pr-8 gap-4">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-white">Progreso de Subtareas</h2>

                    <div className="flex bg-neutral-100 dark:bg-neutral-700 p-1 rounded-lg overflow-x-auto max-w-full">
                        <button
                            onClick={() => setViewMode('status')}
                            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'status'
                                ? 'bg-white dark:bg-neutral-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-neutral-500 dark:text-neutral-300 hover:text-neutral-700'
                                }`}
                        >
                            <CheckCircle2 size={16} />
                            Por Estado
                        </button>
                        <button
                            onClick={() => setViewMode('list_distribution')}
                            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'list_distribution'
                                ? 'bg-white dark:bg-neutral-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-neutral-500 dark:text-neutral-300 hover:text-neutral-700'
                                }`}
                        >
                            <List size={16} />
                            Por Lista
                        </button>
                        <button
                            onClick={() => setViewMode('list_performance')}
                            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'list_performance'
                                ? 'bg-white dark:bg-neutral-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-neutral-500 dark:text-neutral-300 hover:text-neutral-700'
                                }`}
                        >
                            <BarChart3 size={16} />
                            Rendimiento
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 min-h-0">
                    <div className="w-full md:w-3/5 h-72 min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            {viewMode === 'list_performance' ? (
                                <BarChart data={activeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} unit="%" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, 'Avance Promedio']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="avgProgress" radius={[0, 4, 4, 0]}>
                                        {activeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <PieChart>
                                    <Pie
                                        data={activeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {activeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`${value} tareas`, 'Subtareas']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            )}
                        </ResponsiveContainer>
                    </div>

                    <div className="w-full md:w-2/5 space-y-4 max-h-72 overflow-y-auto pr-2">
                        <div className="bg-neutral-50 dark:bg-neutral-700 p-4 rounded-lg">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Total de Subtareas</p>
                            <p className="text-3xl font-bold text-neutral-800 dark:text-white">{totalSubtasks}</p>
                        </div>

                        <div className="space-y-3">
                            {activeData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-md transition-colors">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate" title={item.name}>{item.name}</span>
                                    </div>

                                    <div className="flex flex-col items-end flex-shrink-0 ml-2">
                                        {viewMode === 'list_performance' ? (
                                            <span className="text-sm font-bold text-neutral-800 dark:text-white">{(item as any).avgProgress}%</span>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-neutral-800 dark:text-white">{item.value}</span>
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 w-10 text-right">
                                                        {Math.round((item.value / totalSubtasks) * 100)}%
                                                    </span>
                                                </div>
                                                {viewMode === 'list_distribution' && (
                                                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                                        Avg: {(item as any).avgProgress}%
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
