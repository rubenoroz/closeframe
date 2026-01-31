"use client";

import { useEffect, useState } from "react";
import {
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    Loader2,
    DollarSign,
    Users,
    GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanLimits {
    maxProjects: number;
    maxCloudAccounts: number;
    // Descargas ZIP
    zipDownloadsEnabled: boolean | string;
    maxZipDownloadsPerMonth: number | null;
    // Funcionalidades
    watermarkRemoval: boolean;
    customBranding: boolean;
    passwordProtection: boolean;
    // Soporte
    prioritySupport: boolean;
    // Plan Free restrictions
    maxImagesPerProject: number | null;
    videoEnabled: boolean;
    maxSocialLinks: number;
    lowResThumbnails: boolean;
    lowResDownloads: boolean;
    lowResMaxWidth: number;
    bioMaxLength: number | null;
    watermarkText: string | null;
}

interface Plan {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    price: number;
    monthlyPrice: number | null;
    currency: string;
    interval: string;
    features: string[];
    limits: PlanLimits;
    config?: any;
    isActive: boolean;
    sortOrder: number;
    _count?: {
        users: number;
    };
}

import PlansMatrixTable from "@/components/plans/PlansMatrixTable";
import { PLAN_DEFAULTS } from "@/lib/plan-defaults";

const defaultLimits: PlanLimits = {
    maxProjects: 5,
    maxCloudAccounts: 1,
    zipDownloadsEnabled: true,
    maxZipDownloadsPerMonth: 10,
    watermarkRemoval: false,
    customBranding: false,
    passwordProtection: false,
    prioritySupport: false,
    // Plan Free defaults
    maxImagesPerProject: null,
    videoEnabled: true,
    maxSocialLinks: -1,
    lowResThumbnails: false,
    lowResDownloads: false,
    lowResMaxWidth: 1200,
    bioMaxLength: null,
    watermarkText: null
};

const emptyPlan: Omit<Plan, "id" | "_count"> = {
    name: "",
    displayName: "",
    description: "",
    price: 0,
    monthlyPrice: 0,
    currency: "USD",
    interval: "month",
    features: [],
    limits: defaultLimits,
    isActive: true,
    sortOrder: 0
};

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards'); // New state
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newFeature, setNewFeature] = useState("");
    // Drag and drop state
    const [draggedPlan, setDraggedPlan] = useState<string | null>(null);
    const [dragOverPlan, setDragOverPlan] = useState<string | null>(null);

    const fetchPlans = async () => {
        try {
            const response = await fetch("/api/superadmin/plans");
            const data = await response.json();
            if (data.plans) {
                setPlans(data.plans);
            } else if (Array.isArray(data)) {
                // Fallback for legacy API behavior if any
                setPlans(data);
            } else {
                setPlans([]);
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSave = async () => {
        if (!editingPlan) return;

        setSaving(true);
        try {
            const method = isCreating ? "POST" : "PUT";
            const response = await fetch("/api/superadmin/plans", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingPlan)
            });

            if (response.ok) {
                await fetchPlans();
                setEditingPlan(null);
                setIsCreating(false);
            } else {
                const error = await response.json();
                alert(error.error || "Error al guardar");
            }
        } catch (error) {
            console.error("Error saving plan:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("¿Estás seguro de eliminar este plan?")) return;

        try {
            const response = await fetch(`/api/superadmin/plans?id=${planId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                await fetchPlans();
            } else {
                const error = await response.json();
                alert(error.error || "Error al eliminar");
            }
        } catch (error) {
            console.error("Error deleting plan:", error);
        }
    };

    const addFeature = () => {
        if (!editingPlan || !newFeature.trim()) return;
        setEditingPlan({
            ...editingPlan,
            features: [...editingPlan.features, newFeature.trim()]
        });
        setNewFeature("");
    };

    const removeFeature = (index: number) => {
        if (!editingPlan) return;
        setEditingPlan({
            ...editingPlan,
            features: editingPlan.features.filter((_, i) => i !== index)
        });
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, planId: string) => {
        setDraggedPlan(planId);
        e.dataTransfer.effectAllowed = 'move';
        // Hacer el elemento semi-transparente mientras se arrastra
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedPlan(null);
        setDragOverPlan(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, planId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (planId !== draggedPlan) {
            setDragOverPlan(planId);
        }
    };

    const handleDragLeave = () => {
        setDragOverPlan(null);
    };

    const handleDrop = async (e: React.DragEvent, targetPlanId: string) => {
        e.preventDefault();
        if (!draggedPlan || draggedPlan === targetPlanId) {
            setDraggedPlan(null);
            setDragOverPlan(null);
            return;
        }

        const draggedIndex = plans.findIndex(p => p.id === draggedPlan);
        const targetIndex = plans.findIndex(p => p.id === targetPlanId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Crear nuevo array con el orden actualizado
        const newPlans = [...plans];
        const [removed] = newPlans.splice(draggedIndex, 1);
        newPlans.splice(targetIndex, 0, removed);

        // Actualizar sortOrder de todos los planes afectados
        try {
            const updates = newPlans.map((plan, index) =>
                fetch("/api/superadmin/plans", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: plan.id, sortOrder: index })
                })
            );

            await Promise.all(updates);
            await fetchPlans();
        } catch (error) {
            console.error("Error reordering plans:", error);
        }

        setDraggedPlan(null);
        setDragOverPlan(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Planes</h1>
                    <p className="text-neutral-400 mt-1">
                        Gestiona los planes de suscripción y sus características
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition",
                                viewMode === 'cards' ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
                            )}
                        >
                            Tarjetas
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition",
                                viewMode === 'matrix' ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
                            )}
                        >
                            Matriz Detallada
                        </button>
                    </div>
                    {viewMode === 'cards' && (
                        <button
                            onClick={() => {
                                setEditingPlan({ ...emptyPlan, id: "" } as Plan);
                                setIsCreating(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Plan
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'matrix' ? (
                <PlansMatrixTable />
            ) : (
                /* Plans Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan, index) => (
                        <div
                            key={plan.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, plan.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, plan.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, plan.id)}
                            className={cn(
                                "bg-neutral-900/50 border rounded-2xl p-6 relative cursor-grab active:cursor-grabbing transition-all duration-200",
                                plan.isActive ? "border-neutral-800" : "border-neutral-800/50 opacity-60",
                                draggedPlan === plan.id && "opacity-50 scale-95",
                                dragOverPlan === plan.id && draggedPlan !== plan.id && "border-violet-500 border-2 scale-105"
                            )}
                        >
                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditingPlan(plan);
                                        setIsCreating(false);
                                    }}
                                    className="p-2 hover:bg-neutral-800 rounded-lg transition"
                                >
                                    <Edit2 className="w-4 h-4 text-neutral-400" />
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="p-2 hover:bg-neutral-800 rounded-lg transition"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            </div>

                            {/* Order indicator - Drag handle */}
                            <div className="absolute top-3 left-3 cursor-grab opacity-40 hover:opacity-100 transition">
                                <GripVertical className="w-5 h-5 text-neutral-400" />
                            </div>

                            {/* Plan Info */}
                            <div className="mb-4 pt-2">
                                <h3 className="text-xl font-bold">{plan.displayName}</h3>
                                <span className="text-xs text-neutral-500 uppercase tracking-wider">
                                    {plan.name}
                                </span>
                                {plan.description && (
                                    <p className="text-neutral-400 text-sm mt-1">{plan.description}</p>
                                )}
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-3xl font-bold">
                                    {plan.currency === "USD" ? "$" : plan.currency}
                                    {plan.price}
                                </span>
                                <span className="text-neutral-400">/{plan.interval === "month" ? "mes" : "año"}</span>
                            </div>

                            {/* Users Count */}
                            <div className="flex items-center gap-2 text-sm text-neutral-400 mb-4">
                                <Users className="w-4 h-4" />
                                <span>{plan._count?.users || 0} usuarios</span>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2">
                                {plan.features.slice(0, 5).map((feature, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                                        <span className="text-neutral-300">{feature}</span>
                                    </li>
                                ))}
                                {plan.features.length > 5 && (
                                    <li className="text-sm text-neutral-500">
                                        +{plan.features.length - 5} más...
                                    </li>
                                )}
                            </ul>

                            {/* Status Badge */}
                            {!plan.isActive && (
                                <div className="absolute top-12 left-4">
                                    <span className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded-md">
                                        Inactivo
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'cards' && plans.length === 0 && (
                <div className="text-center py-20 text-neutral-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay planes configurados</p>
                    <p className="text-sm mt-1">Crea tu primer plan de suscripción</p>
                </div>
            )}

            {/* Edit/Create Modal */}
            {editingPlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
                            <h2 className="text-lg font-semibold">
                                {isCreating ? "Nuevo Plan" : "Editar Plan"}
                            </h2>
                            <button
                                onClick={() => {
                                    setEditingPlan(null);
                                    setIsCreating(false);
                                }}
                                className="p-2 hover:bg-neutral-800 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Nombre (slug)
                                    </label>
                                    <input
                                        type="text"
                                        value={editingPlan.name}
                                        onChange={(e) => setEditingPlan({
                                            ...editingPlan,
                                            name: e.target.value.toLowerCase().replace(/\s/g, "-")
                                        })}
                                        placeholder="ej: pro"
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Nombre visible
                                    </label>
                                    <input
                                        type="text"
                                        value={editingPlan.displayName}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, displayName: e.target.value })}
                                        placeholder="ej: Pro"
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    value={editingPlan.description || ""}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500 resize-none"
                                />
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Precio Anual/Base
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingPlan.price}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Precio Mensual (Opcional)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingPlan.monthlyPrice || ""}
                                        placeholder="Solo si difiere del base"
                                        onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: parseFloat(e.target.value) || null })}
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Moneda
                                    </label>
                                    <select
                                        value={editingPlan.currency}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="MXN">MXN</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Intervalo por defecto
                                    </label>
                                    <select
                                        value={editingPlan.interval}
                                        onChange={(e) => setEditingPlan({ ...editingPlan, interval: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                                    >
                                        <option value="month">Mensual</option>
                                        <option value="year">Anual</option>
                                    </select>
                                </div>
                            </div>

                            {/* Template Comparison */}
                            <div>
                                <h3 className="text-sm font-medium text-neutral-300 mb-3">Configuración Base</h3>
                                <p className="text-xs text-neutral-500 mb-4">
                                    Selecciona una plantilla para inicializar todas las características técnicas (Matriz).
                                    Podrás editarlas individualmente después.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {['FREE', 'PRO', 'STUDIO', 'AGENCY'].map((template) => (
                                        <button
                                            key={template}
                                            onClick={() => {
                                                // @ts-ignore
                                                const config = PLAN_DEFAULTS[template];
                                                setEditingPlan({ ...editingPlan, config: config });
                                            }}
                                            className={cn(
                                                "p-3 border rounded-xl text-left transition",
                                                // @ts-ignore
                                                JSON.stringify(editingPlan.config) === JSON.stringify(PLAN_DEFAULTS[template])
                                                    ? "bg-violet-600/20 border-violet-500 ring-1 ring-violet-500"
                                                    : "bg-neutral-800 border-neutral-700 hover:bg-neutral-750"
                                            )}
                                        >
                                            <div className="font-bold text-sm text-neutral-200">{template}</div>
                                            <div className="text-xs text-neutral-400 mt-1">
                                                {template === 'FREE' && 'Básico personal'}
                                                {template === 'PRO' && 'Profesional'}
                                                {template === 'STUDIO' && 'Negocio'}
                                                {template === 'AGENCY' && 'Equipos'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Features Display (Marketing) */}
                            <div>
                                <h3 className="text-sm font-medium text-neutral-300 mb-3 mt-6">Características (Marketing)</h3>
                                <p className="text-xs text-neutral-500 mb-3">
                                    Lista de puntos clave que se mostrarán en la tarjeta de precios.
                                </p>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newFeature}
                                        onChange={(e) => setNewFeature(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                                        placeholder="Agregar característica (ej: 10GB Almacenamiento)..."
                                        className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                                    />
                                    <button
                                        onClick={addFeature}
                                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <ul className="space-y-2">
                                    {editingPlan.features.map((feature, index) => (
                                        <li key={index} className="flex items-center justify-between p-2 bg-neutral-800/50 rounded-lg">
                                            <span className="text-sm text-neutral-300">{feature}</span>
                                            <button
                                                onClick={() => removeFeature(index)}
                                                className="p-1 hover:bg-neutral-700 rounded transition"
                                            >
                                                <X className="w-4 h-4 text-neutral-400" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Active Toggle */}
                            <label className="flex items-center gap-3 cursor-pointer mt-6">
                                <input
                                    type="checkbox"
                                    checked={editingPlan.isActive}
                                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                                />
                                <span className="text-neutral-300">Plan activo</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-neutral-800 sticky bottom-0 bg-neutral-900">
                            <button
                                onClick={() => {
                                    setEditingPlan(null);
                                    setIsCreating(false);
                                }}
                                className="px-4 py-2 text-neutral-400 hover:text-white transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !editingPlan.name || !editingPlan.displayName}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isCreating ? "Crear Plan" : "Guardar cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
