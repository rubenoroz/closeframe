"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FEATURE_POOL } from "@/lib/features";
import { Check, Loader2 } from "lucide-react";
import type { Region } from "@/lib/geo";

interface Plan {
    id: string;
    name: string;
    displayName: string;
    // Legacy fields
    price: number;
    monthlyPrice?: number | null;
    // Regional pricing
    priceMXN?: number;
    monthlyPriceMXN?: number | null;
    priceUSD?: number;
    monthlyPriceUSD?: number | null;
    // Stripe Price IDs
    stripePriceIdMXNMonthly?: string | null;
    stripePriceIdMXNYearly?: string | null;
    stripePriceIdUSDMonthly?: string | null;
    stripePriceIdUSDYearly?: string | null;

    interval: string;
    features: string[];
    isActive: boolean;
    sortOrder: number;
    config?: any;
}

interface PricingSectionProps {
    plans: Plan[];
    region: Region;
}

export function PricingSection({ plans, region }: PricingSectionProps) {
    const router = useRouter();
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('year');
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

    // Use the region detected by IP - no manual toggle
    const currencySymbol = region === 'MX' ? '$' : '$';
    const currencyCode = region === 'MX' ? 'MXN' : 'USD';

    // State for confirmation modal
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'upgrade' | 'downgrade' | null;
        planId: string;
        priceId: string;
        message: string;
        newPlanName: string;
    } | null>(null);

    const handleCheckout = async (planId: string, priceId: string | null | undefined, isFree: boolean) => {
        if (isFree) {
            router.push('/register');
            return;
        }

        if (!priceId) {
            alert('Este plan no está configurado para tu región. Contacta soporte.');
            return;
        }

        setLoadingPlanId(planId);

        try {
            // Step 1: Preview the change first
            const previewResponse = await fetch('/api/stripe/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, priceId }),
            });

            const preview = await previewResponse.json();

            if (!preview.requiresConfirmation) {
                // New subscription - go directly to Stripe
                const checkoutResponse = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId, priceId }),
                });
                const data = await checkoutResponse.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    router.push('/login?redirect=/pricing');
                }
                return;
            }

            // Show confirmation modal
            setConfirmModal({
                show: true,
                type: preview.type,
                planId,
                priceId,
                message: preview.message,
                newPlanName: preview.newPlan
            });

        } catch (error) {
            console.error('Preview error:', error);
            alert('Error al procesar. Intenta de nuevo.');
        } finally {
            setLoadingPlanId(null);
        }
    };

    const confirmPlanChange = async () => {
        if (!confirmModal) return;

        setLoadingPlanId(confirmModal.planId);
        setConfirmModal(null);

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: confirmModal.planId,
                    priceId: confirmModal.priceId
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else if (data.success) {
                if (data.type === 'upgrade') {
                    alert('✅ ¡Plan actualizado! Tu nuevo plan ya está activo.');
                } else if (data.type === 'downgrade') {
                    alert(`📅 Cambio de plan programado. ${data.message}`);
                }
                window.location.href = '/dashboard/settings?success=true';
            } else if (!response.ok) {
                throw new Error(data.message || 'Error al procesar');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Error al procesar. Intenta de nuevo.');
        } finally {
            setLoadingPlanId(null);
        }
    };

    return (
        <section className="py-20 md:py-32 px-6 lg:px-20 bg-[#0a0a0a]" id="pricing">
            <div className="max-w-[1200px] mx-auto text-center mb-12 md:mb-24">
                <h2 className="text-4xl md:text-8xl font-bold mb-10 tracking-tighter">Planes.</h2>

                {/* Billing Cycle Toggle */}
                <div className="inline-flex items-center bg-white/5 p-1 rounded-full border border-white/10 mb-4">
                    <button
                        onClick={() => setBillingCycle('month')}
                        className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'month'
                            ? "bg-white text-black"
                            : "text-white/40 hover:text-white"
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingCycle('year')}
                        className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'year'
                            ? "bg-white text-black"
                            : "text-white/40 hover:text-white"
                            }`}
                    >
                        Anual
                    </button>
                </div>

                {/* Region Indicator - Display only, not clickable */}
                <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                    <span>Precios en</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-white/10">
                        <span className="text-sm">{region === 'MX' ? '🇲🇽' : '🌎'}</span>
                        <span className="font-bold text-white/60">{currencyCode}</span>
                    </span>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {plans.map((plan) => {
                    const isRecommended = plan.name === 'studio';

                    // Get price based on region and billing cycle
                    let priceToShow: number;
                    let stripePriceId: string | null | undefined;

                    if (region === 'MX') {
                        priceToShow = billingCycle === 'month'
                            ? (plan.monthlyPriceMXN ?? plan.priceMXN ?? plan.monthlyPrice ?? plan.price)
                            : (plan.priceMXN ?? plan.price);
                        stripePriceId = billingCycle === 'month'
                            ? plan.stripePriceIdMXNMonthly
                            : plan.stripePriceIdMXNYearly;
                    } else {
                        priceToShow = billingCycle === 'month'
                            ? (plan.monthlyPriceUSD ?? plan.priceUSD ?? plan.monthlyPrice ?? plan.price)
                            : (plan.priceUSD ?? plan.price);
                        stripePriceId = billingCycle === 'month'
                            ? plan.stripePriceIdUSDMonthly
                            : plan.stripePriceIdUSDYearly;
                    }

                    const intervalLabel = billingCycle === 'month' ? '/mes' : '/año';

                    // Format price with locale
                    const formattedPrice = new Intl.NumberFormat(region === 'MX' ? 'es-MX' : 'en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).format(priceToShow);

                    return (
                        <div key={plan.id} className={`bg-white/5 backdrop-blur-xl border p-6 md:p-10 rounded-[2rem] flex flex-col transition-all relative ${isRecommended
                            ? "border-[#cdb8e1]/40 bg-[#cdb8e1]/5 scale-105 z-10 shadow-2xl shadow-[#cdb8e1]/10"
                            : "border-white/10 hover:border-white/20"
                            }`}>
                            {isRecommended && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#cdb8e1] text-black px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Experiencia</div>
                            )}
                            <span className={`text-[10px] font-black tracking-[0.3em] uppercase mb-12 ${isRecommended ? "text-[#cdb8e1]" : "text-white/30"}`}>
                                {plan.displayName}
                            </span>
                            <div className={`flex flex-col mb-10 ${isRecommended ? "text-[#cdb8e1]" : ""}`}>
                                <div className="flex items-baseline">
                                    <span className="text-5xl font-black">{currencySymbol}{formattedPrice}</span>
                                    {priceToShow > 0 && <span className={`${isRecommended ? "text-[#cdb8e1]/60" : "text-white/30"} text-xs ml-2`}>/mes</span>}
                                </div>
                                {/* Show annual total when billing cycle is yearly */}
                                {billingCycle === 'year' && priceToShow > 0 && (
                                    <span className={`text-xs mt-1 ${isRecommended ? "text-[#cdb8e1]/50" : "text-white/25"}`}>
                                        (Pagas {currencySymbol}{new Intl.NumberFormat(region === 'MX' ? 'es-MX' : 'en-US', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        }).format(priceToShow * 12)} al año)
                                    </span>
                                )}
                            </div>

                            <ul className={`space-y-4 mb-12 text-sm flex-1 ${isRecommended ? "text-white/70" : "text-white/50"}`}>
                                {FEATURE_POOL.filter(f => {
                                    const config = plan.config || {};
                                    const group = config.features || {};
                                    const limitGroup = config.limits || {};

                                    const val = f.type === 'number' ? limitGroup[f.id] : group[f.id];
                                    const finalVal = val !== undefined ? val : f.defaultValue;

                                    if (f.type === 'boolean') return finalVal === true;
                                    if (f.type === 'number') return true;
                                    return !!finalVal;
                                }).slice(0, 12).map((feature, i) => {
                                    const config = plan.config || {};
                                    const group = config.features || {};
                                    const limitGroup = config.limits || {};
                                    const val = feature.type === 'number' ? limitGroup[feature.id] : group[feature.id];
                                    const finalVal = val !== undefined ? val : feature.defaultValue;

                                    return (
                                        <li key={i} className={`flex items-start gap-3 ${isRecommended ? "font-bold" : ""}`}>
                                            <Check className={`w-5 h-5 flex-shrink-0 ${isRecommended ? "text-[#cdb8e1]" : "text-[#cdb8e1]"}`} />
                                            <span className="leading-tight">
                                                {feature.type === 'number'
                                                    ? `${feature.label}: ${finalVal === -1 ? 'Ilimitado' : finalVal}`
                                                    : feature.label}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>

                            <button
                                onClick={() => handleCheckout(plan.id, stripePriceId, priceToShow === 0)}
                                disabled={loadingPlanId === plan.id}
                                className={`w-full py-4 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${isRecommended
                                    ? "bg-[#cdb8e1] text-black hover:shadow-2xl hover:shadow-[#cdb8e1]/40"
                                    : "border border-white/10 hover:bg-white hover:text-black"
                                    } ${loadingPlanId === plan.id ? "opacity-70 cursor-wait" : ""}`}
                            >
                                {loadingPlanId === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                                {priceToShow === 0 ? "Registrarse" : isRecommended ? "Experiencia" : "Elegir " + plan.displayName}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Modal */}
            {confirmModal?.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-neutral-800">
                            <h2 className="text-xl font-bold">
                                {confirmModal.type === 'upgrade' ? '⬆️ Confirmar Upgrade' : '⬇️ Confirmar Cambio de Plan'}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-neutral-300">
                                {confirmModal.message}
                            </p>
                            <div className="bg-neutral-800 rounded-xl p-4">
                                <p className="text-sm text-neutral-400">Nuevo plan:</p>
                                <p className="text-lg font-bold text-white">{confirmModal.newPlanName}</p>
                            </div>
                            {confirmModal.type === 'upgrade' && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <p className="text-sm text-amber-400">
                                        💳 Se realizará un cobro inmediato por la diferencia prorrateada.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 p-6 border-t border-neutral-800">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-neutral-700 hover:bg-neutral-800 transition font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPlanChange}
                                disabled={loadingPlanId !== null}
                                className="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 transition font-bold flex items-center justify-center gap-2"
                            >
                                {loadingPlanId && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
