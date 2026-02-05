"use client";

import React, { useState } from "react";
import { Check, X, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PlanFeature {
    text: string;
    included: boolean;
}

interface Plan {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    priceMXN: number;
    monthlyPriceMXN: number | null;
    priceUSD: number;
    monthlyPriceUSD: number | null;
    stripePriceIdMXNMonthly: string | null;
    stripePriceIdMXNYearly: string | null;
    stripePriceIdUSDMonthly: string | null;
    stripePriceIdUSDYearly: string | null;
    features: string; // JSON string
    sortOrder: number;
}

interface PricingClientProps {
    plans: Plan[];
}

export default function PricingClient({ plans }: PricingClientProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [billingInterval, setBillingInterval] = useState<"month" | "year">("year");
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // Sort plans by sortOrder
    const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

    const handleSubscribe = async (plan: Plan) => {
        if (!session) {
            router.push("/login?callbackUrl=/pricing");
            return;
        }

        const isFree = plan.name.toLowerCase().includes("free");
        if (isFree) {
            router.push("/dashboard");
            return;
        }

        // Determine correct Price ID based on currency (assuming MXN for now or allow toggle)
        // ideally we detect user locale or allow currency toggle. For now defaulting to MXN if available.
        const priceId = billingInterval === "year"
            ? plan.stripePriceIdMXNYearly
            : plan.stripePriceIdMXNMonthly;

        if (!priceId) {
            alert("Este plan no está configurado para el periodo seleccionado.");
            return;
        }

        try {
            setIsLoading(plan.id);
            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: plan.id,
                    priceId: priceId,
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else if (data.success) {
                // Upgrade/Downgrade message
                window.location.href = '/dashboard/settings?success=true';
            } else {
                throw new Error(data.message || "Failed to start checkout");
            }
        } catch (error) {
            console.error(error);
            alert("Error al iniciar el pago.");
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white py-10 px-6">
            <div className="max-w-[1600px] mx-auto space-y-12">
                <div className="relative text-center space-y-6">
                    {/* Back Button */}
                    <div className="absolute left-0 top-0">
                        <Link
                            href="/dashboard/billing"
                            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium bg-neutral-900/50 px-4 py-2 rounded-full border border-neutral-800 hover:border-neutral-700"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Volver a Suscripción</span>
                        </Link>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-light pt-8 md:pt-0">Planes y Precios</h1>
                    <p className="text-neutral-400 max-w-xl mx-auto">
                        Elige el plan perfecto para potenciar tu carrera profesional.
                    </p>

                    {/* Toggle */}
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <span className={cn("text-sm cursor-pointer", billingInterval === "month" ? "text-white font-bold" : "text-neutral-500")} onClick={() => setBillingInterval("month")}>Mensual</span>
                        <div
                            className="w-14 h-8 rounded-full bg-neutral-800 p-1 cursor-pointer relative"
                            onClick={() => setBillingInterval(prev => prev === "month" ? "year" : "month")}
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-full bg-white transition-all duration-300",
                                billingInterval === "year" ? "translate-x-6" : "translate-x-0"
                            )} />
                        </div>
                        <span className={cn("text-sm cursor-pointer", billingInterval === "year" ? "text-white font-bold" : "text-neutral-500")} onClick={() => setBillingInterval("year")}>Anual <span className="text-emerald-400 text-xs ml-1">(Ahorra 2 meses)</span></span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mx-auto">
                    {sortedPlans.map((plan) => {
                        let features: string[] = [];
                        try {
                            features = JSON.parse(plan.features);
                        } catch (e) {
                            features = [];
                        }

                        const price = billingInterval === "year"
                            ? (plan.priceMXN > 0 ? `$${plan.priceMXN}` : "Gratis")
                            : (plan.monthlyPriceMXN ? `$${plan.monthlyPriceMXN}` : "—");

                        const isPro = plan.name.toLowerCase().includes("pro");
                        const isFree = plan.name.toLowerCase().includes("free");

                        return (
                            <div
                                key={plan.id}
                                className={cn(
                                    "p-8 rounded-3xl border flex flex-col relative transition-transform hover:-translate-y-2 duration-300",
                                    isPro
                                        ? "bg-neutral-900/80 border-emerald-500/50 shadow-2xl shadow-emerald-500/10 z-10 scale-105"
                                        : "bg-neutral-900/40 border-neutral-800"
                                )}
                            >
                                {isPro && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
                                        Recomendado
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-xl font-medium mb-2">{plan.displayName}</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-4xl font-light">{price}</span>
                                        {plan.priceMXN > 0 && <span className="text-sm text-neutral-500">/{billingInterval === "year" ? "año" : "mes"}</span>}
                                    </div>
                                    <p className="text-sm text-neutral-400 h-10">{plan.description}</p>
                                </div>

                                <div className="space-y-4 mb-8 flex-1">
                                    {features.slice(0, 8).map((feature, i) => (
                                        <div key={i} className="flex items-start gap-3 text-sm">
                                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            <span className="text-neutral-300 leading-tight">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={!!isLoading || (!isFree && !plan.stripePriceIdMXNMonthly && !plan.stripePriceIdMXNYearly)}
                                    className={cn(
                                        "w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center",
                                        isPro
                                            ? "bg-white text-black hover:bg-neutral-200"
                                            : "bg-neutral-800 text-white hover:bg-neutral-700",
                                        (!isFree && !plan.stripePriceIdMXNMonthly) && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isLoading === plan.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        isFree ? "Comenzar Gratis" : "Elegir Plan"
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
