
'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Check, X, Shield, Save, Search } from 'lucide-react';
import { toast } from 'sonner';

import { FEATURE_POOL } from '@/lib/features';

interface Plan {
    id: string;
    name: string;
    displayName: string;
    planFeatures: PlanFeature[];
}

interface Feature {
    id: string;
    key: string;
    description: string;
    category: string;
}

interface PlanFeature {
    planId: string;
    featureId: string;
    enabled: boolean;
    limit: number | null;
}

export default function FeaturesMatrixPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        try {
            const res = await fetch('/api/superadmin/features');
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setPlans(data.plans);
            setFeatures(data.features);
        } catch (error) {
            toast.error("Error cargando matriz");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggle = async (planId: string, featureId: string, currentState: boolean, currentLimit: number | null) => {
        const id = `${planId}-${featureId}`;
        setUpdating(id);

        try {
            const res = await fetch('/api/superadmin/features', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    featureId,
                    enabled: !currentState,
                    limit: currentLimit
                })
            });

            if (!res.ok) throw new Error("Update failed");

            // Optimistic update locally
            setPlans(prev => prev.map(p => {
                if (p.id !== planId) return p;
                const existingPF = p.planFeatures.find(pf => pf.featureId === featureId);
                let newPFs = [...p.planFeatures];
                if (existingPF) {
                    newPFs = newPFs.map(pf => pf.featureId === featureId ? { ...pf, enabled: !currentState } : pf);
                } else {
                    newPFs.push({ planId, featureId, enabled: !currentState, limit: currentLimit });
                }
                return { ...p, planFeatures: newPFs };
            }));

            toast.success("Estado actualizado");
        } catch (error) {
            toast.error("Error al guardar");
        } finally {
            setUpdating(null);
        }
    };

    const handleLimitChange = async (planId: string, featureId: string, isEnabled: boolean, newLimit: number | null) => {
        const id = `${planId}-${featureId}-limit`;
        setUpdating(id);

        try {
            const res = await fetch('/api/superadmin/features', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    featureId,
                    enabled: isEnabled,
                    limit: newLimit
                })
            });

            if (!res.ok) throw new Error("Update failed");

            // Optimistic update locally
            setPlans(prev => prev.map(p => {
                if (p.id !== planId) return p;
                const existingPF = p.planFeatures.find(pf => pf.featureId === featureId);
                let newPFs = [...p.planFeatures];
                if (existingPF) {
                    newPFs = newPFs.map(pf => pf.featureId === featureId ? { ...pf, limit: newLimit } : pf);
                } else {
                    newPFs.push({ planId, featureId, enabled: isEnabled, limit: newLimit });
                }
                return { ...p, planFeatures: newPFs };
            }));

            toast.success("Límite actualizado");
        } catch (error) {
            toast.error("Error al guardar límite");
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    // Only show features that are defined in the code's FEATURE_POOL
    const poolKeys = new Set(FEATURE_POOL.map(fp => fp.id));
    const enhancedFeatures = features
        .filter(f => poolKeys.has(f.key))
        .map(f => {
            const featureDef = FEATURE_POOL.find(fp => fp.id === f.key);
            return {
                ...f,
                category: featureDef?.category || f.category,
                label: featureDef?.label || f.key,
                description: featureDef?.description || f.description,
                icon: featureDef?.icon,
                type: featureDef?.type
            };
        });

    // Ordered list of categories as requested
    const categoryOrder = ['profile', 'gallery', 'booking', 'scena', 'collaboration', 'monetization', 'analytics', 'system'];

    // Get all unique categories for tabs and sort them
    const allCategories = Array.from(new Set(enhancedFeatures.map(f => f.category))).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        // Put unknown categories at the end
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    // Filter features based on selection and search
    const filteredFeatures = enhancedFeatures.filter(f => {
        const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = f.label.toLowerCase().includes(searchLower) ||
            f.description.toLowerCase().includes(searchLower) ||
            f.key.toLowerCase().includes(searchLower);
        return matchesCategory && matchesSearch;
    });

    // Get categories present in the filtered results to render headers, sorted same as tabs
    const activeCategories = Array.from(new Set(filteredFeatures.map(f => f.category))).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    const categoryLabels: Record<string, string> = {
        profile: 'Perfil',
        gallery: 'Galería',
        booking: 'Reservas',
        system: 'Sistema',
        analytics: 'Analítica',
        collaboration: 'Colaboración',
        monetization: 'Monetización',
        scena: 'Scena (Kanban)',
        video: 'Video',
        payments: 'Pagos'
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                            Matriz de Features
                        </h1>
                        <p className="text-neutral-400 text-sm">Control centralizado de permisos y límites por plan.</p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar característica..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 rounded-lg pl-3 pr-10 py-2 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 w-full md:w-64 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${selectedCategory === 'all'
                            ? 'bg-emerald-500 text-black'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                            }`}
                    >
                        Todo
                    </button>
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${selectedCategory === cat
                                ? 'bg-emerald-500 text-black'
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                                }`}
                        >
                            {categoryLabels[cat] || cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl hidden md:block">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-neutral-950 text-neutral-400 sticky top-0 z-10 border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-4 font-bold sticky left-0 bg-neutral-950 min-w-[350px] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Característica</th>
                            {plans.map(plan => (
                                <th key={plan.id} className="px-6 py-4 text-center min-w-[180px] border-l border-neutral-800/50">
                                    <span className="text-neutral-100 font-bold tracking-widest">{plan.displayName}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {activeCategories.map(category => (
                            <React.Fragment key={category}>
                                <tr className="bg-neutral-800/80">
                                    <td colSpan={plans.length + 1} className="px-6 py-2.5 font-bold text-emerald-400 uppercase text-[10px] tracking-[0.2em] sticky left-0 bg-neutral-800/80 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                                        {categoryLabels[category] || category}
                                    </td>
                                </tr>
                                {filteredFeatures.filter(f => f.category === category).map(feature => {
                                    const label = feature.label;
                                    const desc = feature.description;
                                    const isNumeric = feature.type === 'number' || feature.key.startsWith('max');

                                    return (
                                        <tr key={feature.id} className="hover:bg-violet-500/5 transition-colors group">

                                            <td className="px-6 py-4 sticky left-0 bg-neutral-900 border-r border-neutral-800 shadow-[2px_0_5px_rgba(0,0,0,0.5)] z-10">
                                                <div className="flex items-center gap-3">
                                                    {feature.icon && <feature.icon className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />}
                                                    <div>
                                                        <div className="font-semibold text-neutral-200 group-hover:text-white transition-colors">{label}</div>
                                                        <div className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1 group-hover:text-neutral-400 transition-colors">{desc}</div>
                                                        <div className="text-[9px] text-neutral-600 font-mono mt-1 opacity-50">{feature.key}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {plans.map(plan => {
                                                const pf = plan.planFeatures.find(f => f.featureId === feature.id);
                                                const isEnabled = pf?.enabled ?? false;
                                                const limit = pf?.limit ?? null;
                                                const id = `${plan.id}-${feature.id}`;

                                                return (
                                                    <td key={id} className="px-6 py-4 text-center border-l border-neutral-800/50">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <button
                                                                onClick={() => handleToggle(plan.id, feature.id, isEnabled, limit)}
                                                                disabled={updating === id}
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isEnabled
                                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:border-neutral-600'
                                                                    }`}
                                                            >
                                                                {updating === id ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : isEnabled ? (
                                                                    <Check className="w-5 h-5" />
                                                                ) : (
                                                                    <X className="w-5 h-5" />
                                                                )}
                                                            </button>

                                                            {isNumeric && (
                                                                <div className="relative group/limit w-24">
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={limit ?? -1}
                                                                        onBlur={(e) => {
                                                                            const val = parseInt(e.target.value);
                                                                            if (val !== limit) {
                                                                                handleLimitChange(plan.id, feature.id, isEnabled, val === -1 ? null : val);
                                                                            }
                                                                        }}
                                                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-[11px] text-center text-neutral-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                                                                        placeholder="∞"
                                                                    />
                                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-focus-within/limit:block bg-neutral-800 text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                                                                        Enter para guardar. -1 = ∞
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!isNumeric && limit !== null && (
                                                                <div className="text-[10px] text-neutral-500 font-mono mt-1">
                                                                    Lim: {limit}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {activeCategories.map(category => (
                    <div key={category}>
                        <div className="px-1 py-2 mb-2">
                            <span className="text-emerald-400 uppercase text-[10px] tracking-[0.2em] font-bold">
                                {categoryLabels[category] || category}
                            </span>
                        </div>
                        {filteredFeatures.filter(f => f.category === category).map(feature => {
                            const isNumeric = feature.type === 'number' || feature.key.startsWith('max');

                            return (
                                <div key={feature.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-2">
                                    <div className="flex items-start gap-2 mb-3">
                                        {feature.icon && <feature.icon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-neutral-200">{feature.label}</p>
                                            <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{feature.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                        {plans.map(plan => {
                                            const pf = plan.planFeatures.find(f => f.featureId === feature.id);
                                            const isEnabled = pf?.enabled ?? false;
                                            const limit = pf?.limit ?? null;
                                            const id = `${plan.id}-${feature.id}`;
                                            const limitId = `${plan.id}-${feature.id}-limit`;

                                            return (
                                                <div key={id} className="flex flex-col items-center gap-1 min-w-[60px]">
                                                    <button
                                                        onClick={() => handleToggle(plan.id, feature.id, isEnabled, limit)}
                                                        disabled={updating === id}
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all text-xs ${isEnabled
                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-neutral-800 text-neutral-600 border border-neutral-700'
                                                            }`}
                                                    >
                                                        {updating === id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : isEnabled ? (
                                                            <Check className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <X className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    {isNumeric && (
                                                        <input
                                                            type="number"
                                                            defaultValue={limit ?? -1}
                                                            onBlur={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                if (val !== limit) {
                                                                    handleLimitChange(plan.id, feature.id, isEnabled, val === -1 ? null : val);
                                                                }
                                                            }}
                                                            className="w-14 bg-neutral-950 border border-neutral-800 rounded px-1 py-0.5 text-[10px] text-center text-neutral-400 focus:outline-none focus:border-emerald-500/50 font-mono"
                                                            placeholder="∞"
                                                        />
                                                    )}
                                                    <span className="text-[9px] text-neutral-500 truncate max-w-[60px]">{plan.displayName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

