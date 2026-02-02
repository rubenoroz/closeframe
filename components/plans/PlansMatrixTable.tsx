"use client";

import React, { useEffect, useState } from "react";
import { FEATURE_POOL } from "@/lib/features";
import { Check, X, Save, RefreshCw, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";


interface Props {
    onUpdate?: () => void;
}

export default function PlansMatrixTable({ onUpdate }: Props) {
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

            // Notify parent to refresh
            if (onUpdate) onUpdate();

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
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={fetchPlans} className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 text-neutral-400">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="overflow-x-auto border border-neutral-800 rounded-xl shadow-sm bg-neutral-900">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-neutral-900 border-b border-neutral-800">
                            <th className="p-4 text-left font-bold text-neutral-400 w-1/3">Característica</th>
                            {plans.map(plan => (
                                <th key={plan.id} className="p-4 text-center font-bold min-w-[150px]">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="uppercase tracking-wider text-white">{plan.displayName}</span>
                                        <button
                                            onClick={() => handleSavePlan(plan)}
                                            disabled={!!saving}
                                            className="text-xs font-normal flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded transition disabled:opacity-50"
                                        >
                                            {saving === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            Guardar
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
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
                                    <tr key={feature.id} className="group hover:bg-neutral-800/50 transition">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {feature.icon && <feature.icon className="w-4 h-4 text-neutral-400" />}
                                                <div>
                                                    <div className="font-medium text-neutral-300">{feature.label}</div>
                                                    <div className="text-xs text-neutral-500">{feature.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {plans.map(plan => {
                                            const val = getValue(plan, feature.id, feature.type === 'boolean' ? 'features' : 'limits');
                                            const displayVal = val !== undefined ? val : feature.defaultValue;

                                            return (
                                                <td key={`${plan.id}-${feature.id}`} className="p-4 text-center">
                                                    {feature.type === 'boolean' ? (
                                                        <button
                                                            onClick={() => updateLocalValue(plan.id, feature.id, 'features', !displayVal)}
                                                            className={cn(
                                                                "w-12 h-6 rounded-full relative transition-colors duration-300 mx-auto",
                                                                displayVal ? "bg-emerald-500" : "bg-neutral-700"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow",
                                                                displayVal ? "left-7" : "left-1"
                                                            )} />
                                                        </button>
                                                    ) : feature.type === 'select' ? (
                                                        <div className="relative">
                                                            <select
                                                                value={String(displayVal)}
                                                                onChange={(e) => {
                                                                    let val: any = e.target.value;
                                                                    if (val === 'true') val = true;
                                                                    if (val === 'false') val = false;
                                                                    updateLocalValue(plan.id, feature.id, 'features', val);
                                                                }}
                                                                className="w-full min-w-[140px] px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500 appearance-none cursor-pointer text-center"
                                                            >
                                                                {feature.options?.map(opt => (
                                                                    <option key={String(opt.value)} value={String(opt.value)} className="bg-neutral-900">
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={displayVal === -1 ? '' : displayVal}
                                                                    placeholder={displayVal === -1 ? "∞" : "0"}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value === '' ? -1 : parseInt(e.target.value);
                                                                        updateLocalValue(plan.id, feature.id, 'limits', v);
                                                                    }}
                                                                    className={cn(
                                                                        "w-24 text-center border border-neutral-700 rounded-lg py-1.5 bg-neutral-800 text-white text-sm focus:ring-2 ring-violet-500 outline-none",
                                                                        feature.id === 'maxSocialLinks' && displayVal === 1 && "border-emerald-500/50"
                                                                    )}
                                                                />
                                                                {displayVal === -1 && (
                                                                    <div className="absolute right-2 top-1.5 pointer-events-none text-emerald-500 font-bold text-xs">∞</div>
                                                                )}
                                                            </div>

                                                            {/* Semantic Helper Text */}
                                                            <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
                                                                {feature.id === 'maxSocialLinks' && (
                                                                    displayVal === 1 ? 'Solo Insta' :
                                                                        displayVal === -1 ? 'Todas' : 'Redes'
                                                                )}
                                                                {feature.id === 'bioMaxLength' && (
                                                                    displayVal === 150 ? 'Corta' :
                                                                        displayVal > 150 ? 'Extendida' : 'N/A'
                                                                )}
                                                                {feature.id === 'bookingWindow' && (
                                                                    displayVal === 0 ? 'Siempre' : `${displayVal} Semanas`
                                                                )}
                                                                {feature.id === 'maxProjects' && (
                                                                    displayVal === -1 ? 'Ilimitados' : 'Proyectos'
                                                                )}
                                                            </span>
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
