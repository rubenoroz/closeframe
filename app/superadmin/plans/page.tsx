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
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanLimits {
    maxProjects: number;
    maxCloudAccounts: number;
    // Descargas ZIP
    zipDownloadsEnabled: boolean;
    maxZipDownloadsPerMonth: number | null; // null = ilimitado
    // Funcionalidades
    watermarkRemoval: boolean;
    customBranding: boolean;
    passwordProtection: boolean;
    // Soporte
    prioritySupport: boolean;
}

interface Plan {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    price: number;
    currency: string;
    interval: string;
    features: string[];
    limits: PlanLimits;
    isActive: boolean;
    sortOrder: number;
    _count?: {
        users: number;
    };
}

const defaultLimits: PlanLimits = {
    maxProjects: 5,
    maxCloudAccounts: 1,
    zipDownloadsEnabled: true,
    maxZipDownloadsPerMonth: 10, // 10 descargas ZIP al mes
    watermarkRemoval: false,
    customBranding: false,
    passwordProtection: false,
    prioritySupport: false
};

const emptyPlan: Omit<Plan, "id" | "_count"> = {
    name: "",
    displayName: "",
    description: "",
    price: 0,
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
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newFeature, setNewFeature] = useState("");

    const fetchPlans = async () => {
        try {
            const response = await fetch("/api/superadmin/plans");
            const data = await response.json();
            setPlans(data);
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Planes</h1>
                    <p className="text-neutral-400 mt-1">
                        Gestiona los planes de suscripción
                    </p>
                </div>
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
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={cn(
                            "bg-neutral-900/50 border rounded-2xl p-6 relative",
                            plan.isActive ? "border-neutral-800" : "border-neutral-800/50 opacity-60"
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

                        {/* Plan Info */}
                        <div className="mb-4">
                            <span className="text-xs text-neutral-500 uppercase tracking-wider">
                                {plan.name}
                            </span>
                            <h3 className="text-xl font-bold mt-1">{plan.displayName}</h3>
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
                            <div className="absolute top-4 left-4">
                                <span className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded-md">
                                    Inactivo
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {plans.length === 0 && (
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
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Precio
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
                                        Intervalo
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

                            {/* Limits */}
                            <div>
                                <h3 className="text-sm font-medium text-neutral-300 mb-3">Límites</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs text-neutral-400 mb-1">Máx. Proyectos</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingPlan.limits.maxProjects}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, maxProjects: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-400 mb-1">Máx. Nubes conectadas</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingPlan.limits.maxCloudAccounts}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, maxCloudAccounts: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>

                                <h4 className="text-xs text-neutral-400 mb-2">Descargas ZIP</h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-neutral-800/50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={editingPlan.limits.zipDownloadsEnabled}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, zipDownloadsEnabled: e.target.checked }
                                            })}
                                            className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm text-neutral-300">Habilitadas</span>
                                    </label>
                                    <div>
                                        <label className="block text-xs text-neutral-400 mb-1">Descargas/mes (0 = ilimitado)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingPlan.limits.maxZipDownloadsPerMonth ?? 0}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: {
                                                    ...editingPlan.limits,
                                                    maxZipDownloadsPerMonth: parseInt(e.target.value) || null
                                                }
                                            })}
                                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                                        />
                                    </div>
                                </div>

                                <h4 className="text-xs text-neutral-400 mb-2">Funcionalidades</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-neutral-800/50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={editingPlan.limits.watermarkRemoval}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, watermarkRemoval: e.target.checked }
                                            })}
                                            className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm text-neutral-300">Sin marca de agua</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-neutral-800/50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={editingPlan.limits.customBranding}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, customBranding: e.target.checked }
                                            })}
                                            className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm text-neutral-300">Logo personalizado</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-neutral-800/50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={editingPlan.limits.passwordProtection}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, passwordProtection: e.target.checked }
                                            })}
                                            className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm text-neutral-300">Protección con contraseña</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-neutral-800/50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={editingPlan.limits.prioritySupport}
                                            onChange={(e) => setEditingPlan({
                                                ...editingPlan,
                                                limits: { ...editingPlan.limits, prioritySupport: e.target.checked }
                                            })}
                                            className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm text-neutral-300">Soporte prioritario</span>
                                    </label>
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <h3 className="text-sm font-medium text-neutral-300 mb-3">Características</h3>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newFeature}
                                        onChange={(e) => setNewFeature(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                                        placeholder="Agregar característica..."
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
                            <label className="flex items-center gap-3 cursor-pointer">
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
