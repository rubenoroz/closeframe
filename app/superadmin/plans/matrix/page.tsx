"use client";

import React, { useEffect, useState } from "react";
import { FEATURE_POOL } from "@/lib/features";
import { Check, X, Save, RefreshCw, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function PlansMatrixPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Fetch plans on mount
    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/plans");
            const data = await res.json();
            if (data.plans) {
                setPlans(data.plans);
            } else if (Array.isArray(data)) {
                setPlans(data);
            } else {
                setPlans([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get value
    const getValue = (plan: any, featureId: string, category: 'features' | 'limits') => {
        // Look in plan.config
        const config = plan.config || {};
        const group = config[category] || {};
        return group[featureId];
    };

    // Helper to update local state
    const updateLocalValue = (planId: string, featureId: string, category: 'features' | 'limits', newValue: any) => {
        setPlans(prev => prev.map(p => {
            if (p.id !== planId) return p;

            const currentConfig = p.config || { features: {}, limits: {} };
            return {
                ...p,
                config: {
                    ...currentConfig,
                    [category]: {
                        ...currentConfig[category],
                        [featureId]: newValue
                    }
                }
            };
        }));
    };

    // Save single plan
    const handleSavePlan = async (plan: any) => {
        setSaving(plan.id);
        try {
            const res = await fetch("/api/superadmin/plans", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: plan.id,
                    config: plan.config
                })
            });

            if (!res.ok) throw new Error("Failed to save");

            // Show success toast (mock)
            alert(`Plan ${plan.displayName} actualizado!`);
        } catch (err) {
            console.error(err);
            alert("Error al guardar");
        } finally {
            setSaving(null);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    // Group features by category
    const categories = Array.from(new Set(FEATURE_POOL.map(f => f.category)));

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Matriz de Características</h1>
                    <p className="text-neutral-500">Gestiona qué incluye cada plan de forma modular.</p>
                </div>
                <button onClick={fetchPlans} className="p-2 bg-neutral-100 rounded-full hover:bg-neutral-200">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-neutral-50 border-b">
                            <th className="p-4 text-left font-medium text-neutral-500 w-1/3">Característica</th>
                            {plans.map(plan => (
                                <th key={plan.id} className="p-4 text-center font-bold min-w-[150px]">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="uppercase tracking-wider">{plan.displayName}</span>
                                        <button
                                            onClick={() => handleSavePlan(plan)}
                                            disabled={!!saving}
                                            className="text-xs font-normal flex items-center gap-1 bg-white border px-2 py-1 rounded hover:bg-neutral-50 disabled:opacity-50"
                                        >
                                            {saving === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            Guardar
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {categories.map(cat => (
                            <React.Fragment key={cat}>
                                {/* Category Header */}
                                <tr className="bg-neutral-800 border-y border-neutral-700">
                                    <td colSpan={plans.length + 1} className="p-3 font-bold text-xs uppercase tracking-widest text-neutral-200 pl-4">
                                        {cat === 'profile' ? 'Perfil' :
                                            cat === 'gallery' ? 'Galería' :
                                                cat === 'booking' ? 'Reservas' :
                                                    cat === 'monetization' ? 'Monetización' :
                                                        cat === 'collaboration' ? 'Colaboración' :
                                                            cat === 'analytics' ? 'Analítica' : 'Sistema'}
                                    </td>
                                </tr>

                                {/* Features in Category */}
                                {FEATURE_POOL.filter(f => f.category === cat).map(feature => (
                                    <tr key={feature.id} className="group hover:bg-neutral-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {feature.icon && <feature.icon className="w-4 h-4 text-neutral-400" />}
                                                <div>
                                                    <div className="font-medium">{feature.label}</div>
                                                    <div className="text-xs text-neutral-400">{feature.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {plans.map(plan => {
                                            const val = getValue(plan, feature.id, feature.type === 'boolean' ? 'features' : 'limits');

                                            // Ensure value is not undefined (fallback to feature default)
                                            const displayVal = val !== undefined ? val : feature.defaultValue;

                                            return (
                                                <td key={`${plan.id}-${feature.id}`} className="p-4 text-center">
                                                    {feature.type === 'boolean' ? (
                                                        <button
                                                            onClick={() => updateLocalValue(plan.id, feature.id, 'features', !displayVal)}
                                                            className={cn(
                                                                "w-12 h-6 rounded-full relative transition-colors duration-300 mx-auto",
                                                                displayVal ? "bg-emerald-500" : "bg-neutral-200"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow",
                                                                displayVal ? "left-7" : "left-1"
                                                            )} />
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center justify-center">
                                                            {/* Number Input Support */}
                                                            {feature.id.includes('Max') || feature.id.includes('Window') ? (
                                                                <input
                                                                    type="number"
                                                                    value={displayVal === -1 ? '' : displayVal} // -1 usually means unlimited
                                                                    placeholder={displayVal === -1 ? "∞" : "0"}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value === '' ? -1 : parseInt(e.target.value);
                                                                        updateLocalValue(plan.id, feature.id, 'limits', v);
                                                                    }}
                                                                    className="w-20 text-center border rounded-lg py-1.5 bg-white text-sm focus:ring-2 ring-emerald-500 outline-none"
                                                                />
                                                            ) : (
                                                                <span className="text-neutral-400 italic">N/A</span>
                                                            )}
                                                            {displayVal === -1 && <span className="ml-2 text-xs font-bold text-emerald-600">ILIMITADO</span>}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
