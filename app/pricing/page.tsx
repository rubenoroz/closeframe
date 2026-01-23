"use client";

import React, { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const PLANS = [
    {
        id: "free",
        name: "Personal",
        price: "$0",
        description: "Para entusiastas y portafolios básicos",
        features: [
            { text: "Hasta 12 galerías", included: true },
            { text: "1 cuenta de nube conectada", included: true },
            { text: "Perfil público básico", included: true },
            { text: "Marca de agua 'Closeframe'", included: true },
            { text: "Descargas estándar", included: true },
            { text: "Videos en galerías", included: false },
            { text: "Organización manual", included: false },
        ],
        buttonText: "Tu plan actual",
        stripePriceId: null, // Free plan
    },
    {
        id: "pro",
        name: "Profesional",
        price: "$299 MXN",
        period: "/mes",
        description: "Para fotógrafos activos y estudios",
        features: [
            { text: "Galerías ILIMITADAS", included: true },
            { text: "Hasta 3 nubes conectadas", included: true },
            { text: "Perfil PRO (Portada, CTA, Pronombres)", included: true },
            { text: "Sin marca de agua de plataforma", included: true },
            { text: "Organización manual de fotos", included: true },
            { text: "Soporte para Video", included: true },
            { text: "Descargas de alta velocidad", included: true },
        ],
        buttonText: "Actualizar a PRO",
        primary: true,
        stripePriceId: "price_1QjXXXX...", // Replace with real ID or fetch dynamically
        // You might want to fetch this from an API or env var in a real app
    }
];

export default function PricingPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleSubscribe = async (plan: typeof PLANS[0]) => {
        if (!plan.stripePriceId) return; // Free plan logic or already active

        try {
            setIsLoading(plan.id);
            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: plan.id,
                    priceId: plan.stripePriceId || "price_1Qm...", // Fallback or env
                }),
            });

            if (!response.ok) throw new Error("Failed to start checkout");

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error(error);
            alert("Error al iniciar el pago. Por favor intenta de nuevo.");
            setIsLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white py-20 px-6">
            <div className="max-w-5xl mx-auto space-y-16">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-light">Planes y Precios</h1>
                    <p className="text-neutral-400 max-w-xl mx-auto">
                        Mejora tu flujo de trabajo, entrega más rápido y presenta tu trabajo con la elegancia que merece.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={cn(
                                "p-8 rounded-3xl border flex flex-col relative",
                                plan.primary
                                    ? "bg-neutral-900/50 border-emerald-500/50 shadow-2xl shadow-emerald-500/10"
                                    : "bg-neutral-900/20 border-neutral-800"
                            )}
                        >
                            {plan.primary && (
                                <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
                                    Recomendado
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-medium mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-light">{plan.price}</span>
                                    {plan.period && <span className="text-sm text-neutral-500">{plan.period}</span>}
                                </div>
                                <p className="text-sm text-neutral-400">{plan.description}</p>
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        {feature.included ? (
                                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 text-neutral-700 shrink-0" />
                                        )}
                                        <span className={feature.included ? "text-neutral-200" : "text-neutral-600"}>
                                            {feature.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleSubscribe(plan)}
                                disabled={!!isLoading || !plan.stripePriceId}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center",
                                    plan.primary
                                        ? "bg-white text-black hover:bg-neutral-200"
                                        : "bg-neutral-800 text-white hover:bg-neutral-700",
                                    (!plan.stripePriceId) && "opacity-50 cursor-not-allowed bg-transparent border border-neutral-800 hover:bg-transparent"
                                )}
                            >
                                {isLoading === plan.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    plan.buttonText
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
