"use client";

import React, { useState } from "react";

interface Plan {
    id: string;
    name: string;
    displayName: string;
    price: number;
    monthlyPrice?: number | null;
    interval: string;
    features: string;
    isActive: boolean;
    sortOrder: number;
}

interface PricingSectionProps {
    plans: Plan[];
}

const parseFeatures = (json: string) => {
    try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch {
        return [];
    }
};

export function PricingSection({ plans }: PricingSectionProps) {
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('year');

    return (
        <section className="py-32 px-6 lg:px-20 bg-[#0a0a0a]" id="pricing">
            <div className="max-w-[1200px] mx-auto text-center mb-24">
                <h2 className="text-6xl md:text-8xl font-bold mb-10 tracking-tighter">Planes.</h2>
                <div className="inline-flex items-center bg-white/5 p-1 rounded-full border border-white/10">
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
            </div>
            {/* Updated to 5 columns for dynamic plans */}
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {plans.map((plan) => {
                    const isRecommended = plan.name === 'studio';
                    const features = parseFeatures(plan.features) as string[];

                    // Determine price to show
                    // If billingCycle is 'month', show monthlyPrice if available, else standard price
                    // If billingCycle is 'year', show standard price (assuming standard price is for the interval set in DB, often used for anual)
                    // Wait, if standard price is annual (e.g. 5000), we show 5000 /año.
                    // If standard price is monthly-billed-annually, it might be 400. 
                    // Let's assume:
                    // 'year' view -> base plan.price
                    // 'month' view -> plan.monthlyPrice ?? plan.price

                    const priceToShow = billingCycle === 'month' && plan.monthlyPrice
                        ? plan.monthlyPrice
                        : plan.price;

                    const intervalLabel = billingCycle === 'month' ? '/mes' : '/año';

                    return (
                        <div key={plan.id} className={`bg-white/5 backdrop-blur-xl border p-10 rounded-[2rem] flex flex-col transition-all relative ${isRecommended
                            ? "border-[#cdb8e1]/40 bg-[#cdb8e1]/5 scale-105 z-10 shadow-2xl shadow-[#cdb8e1]/10"
                            : "border-white/10 hover:border-white/20"
                            }`}>
                            {isRecommended && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#cdb8e1] text-black px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Experiencia</div>
                            )}
                            <span className={`text-[10px] font-black tracking-[0.3em] uppercase mb-12 ${isRecommended ? "text-[#cdb8e1]" : "text-white/30"}`}>
                                {plan.displayName}
                            </span>
                            <div className={`flex items-baseline mb-10 ${isRecommended ? "text-[#cdb8e1]" : ""}`}>
                                <span className="text-5xl font-black">${priceToShow}</span>
                                {priceToShow > 0 && <span className={`${isRecommended ? "text-[#cdb8e1]/60" : "text-white/30"} text-xs ml-2`}>{intervalLabel}</span>}
                            </div>

                            <ul className={`space-y-6 mb-12 text-sm flex-1 ${isRecommended ? "text-white/70" : "text-white/50"}`}>
                                {features.slice(0, 10).map((feature: string, i: number) => (
                                    <li key={i} className={`flex items-start gap-3 ${isRecommended ? "font-bold" : ""}`}>
                                        <span className={`material-symbols-outlined text-lg flex-shrink-0 ${isRecommended ? "text-[#cdb8e1]" : "text-[#cdb8e1]"}`}>check</span>
                                        <span className="leading-tight">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button className={`w-full py-4 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all ${isRecommended
                                ? "bg-[#cdb8e1] text-black hover:shadow-2xl hover:shadow-[#cdb8e1]/40"
                                : "border border-white/10 hover:bg-white hover:text-black"
                                }`}>
                                {priceToShow === 0 ? "Registrarse" : isRecommended ? "Experiencia" : "Elegir " + plan.displayName}
                            </button>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
