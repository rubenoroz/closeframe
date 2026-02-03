"use client";

import React, { useState } from "react";
import { ExternalLink, Calendar, Loader2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileCTAProps {
    callToAction: {
        label?: string;
        url?: string;
        type?: 'link' | 'booking';
    };
    userId: string;
    isLight: boolean;
    bookingWindow: number;
    bookingLeadTime: number;
}

export default function ProfileCTA({ callToAction, userId, isLight, bookingWindow, bookingLeadTime }: ProfileCTAProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        date: "",
        notes: ""
    });

    if (!callToAction?.label) return null;

    // Calculate max date based on booking settings
    const getMaxDate = () => {
        if (bookingWindow === 0) return undefined; // No limit
        const date = new Date();
        date.setDate(date.getDate() + (bookingWindow * 7));
        return date.toISOString().split('T')[0];
    };
    const maxDate = getMaxDate();

    // Calculate min date based on lead time
    const getMinDate = () => {
        const date = new Date();
        const daysToAdd = bookingLeadTime ?? 1; // Default 1 day if undefined
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString().split('T')[0];
    };
    const minDate = getMinDate();

    // RENDER LINK
    if (callToAction.type !== 'booking') {
        if (!callToAction.url) return null;
        return (
            <div className="mb-10">
                <a
                    href={callToAction.url.startsWith('http') ? callToAction.url : `https://${callToAction.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-transform hover:scale-105",
                        isLight ? "bg-neutral-900 text-white hover:bg-black" : "bg-white text-black hover:bg-neutral-200"
                    )}
                >
                    {callToAction.label} <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>
        );
    }

    // RENDER BOOKING BUTTON & MODAL
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/public/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    ...formData
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Error al enviar la reserva");
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || "No se pudo enviar la solicitud. Intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="mb-10">
                <button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        "inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-transform hover:scale-105",
                        isLight ? "bg-neutral-900 text-white hover:bg-black" : "bg-white text-black hover:bg-neutral-200"
                    )}
                >
                    {callToAction.label} <Calendar className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className={cn(
                        "w-full max-w-md p-6 rounded-3xl shadow-2xl relative",
                        isLight ? "bg-white text-neutral-900" : "bg-neutral-900 text-white border border-neutral-800"
                    )}>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 opacity-50" />
                        </button>

                        {!isSuccess ? (
                            <>
                                <h3 className="text-xl font-light mb-2">{callToAction.label}</h3>
                                <p className="text-sm opacity-60 mb-6">Completa tus datos para enviarme una solicitud.</p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">Tu Nombre</label>
                                        <input
                                            required
                                            value={formData.customerName}
                                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl outline-none transition-all border",
                                                isLight
                                                    ? "bg-neutral-50 border-neutral-200 focus:border-black"
                                                    : "bg-neutral-800/50 border-neutral-800 focus:border-white"
                                            )}
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">Tu Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={formData.customerEmail}
                                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl outline-none transition-all border",
                                                isLight
                                                    ? "bg-neutral-50 border-neutral-200 focus:border-black"
                                                    : "bg-neutral-800/50 border-neutral-800 focus:border-white"
                                            )}
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">Tu Teléfono (WhatsApp)</label>
                                        <input
                                            required
                                            type="tel"
                                            value={formData.customerPhone}
                                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl outline-none transition-all border",
                                                isLight
                                                    ? "bg-neutral-50 border-neutral-200 focus:border-black"
                                                    : "bg-neutral-800/50 border-neutral-800 focus:border-white"
                                            )}
                                            placeholder="+52 55 1234 5678"
                                            pattern="[+]?[0-9]*"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">Fecha deseada</label>
                                        <input
                                            required
                                            type="date"
                                            min={minDate}
                                            max={maxDate}
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl outline-none transition-all border",
                                                isLight
                                                    ? "bg-neutral-50 border-neutral-200 focus:border-black"
                                                    : "bg-neutral-800/50 border-neutral-800 focus:border-white text-white icon-invert"
                                            )}
                                        />
                                        {bookingWindow > 0 && (
                                            <p className="text-[10px] opacity-40 ml-1">
                                                Solo se permiten reservas hasta con {bookingWindow} sem. de anticipación.
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">Notas / Detalles</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl outline-none transition-all border min-h-[100px]",
                                                isLight
                                                    ? "bg-neutral-50 border-neutral-200 focus:border-black"
                                                    : "bg-neutral-800/50 border-neutral-800 focus:border-white"
                                            )}
                                            placeholder="Cuéntame sobre tu proyecto..."
                                        />
                                    </div>

                                    {/* WARNING DISCLAIMER */}
                                    <div className={cn(
                                        "p-3 rounded-xl text-xs flex gap-2 items-start",
                                        isLight ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    )}>
                                        <Check className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>
                                            <strong>Nota:</strong> Esta solicitud es provisional. La fecha y hora exacta de tu cita se confirmará vía WhatsApp o llamada telefónica.
                                        </span>
                                    </div>

                                    {error && <p className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={cn(
                                            "w-full py-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 mt-4",
                                            isLight
                                                ? "bg-black text-white hover:bg-neutral-800"
                                                : "bg-white text-black hover:bg-neutral-200",
                                            isLoading && "opacity-70 cursor-not-allowed"
                                        )}
                                    >
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isLoading ? "Enviando..." : "Enviar Solicitud"}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-medium mb-2">¡Solicitud enviada!</h3>
                                <p className="text-sm opacity-60 mb-8">
                                    Hemos notificado al fotógrafo. Te contactará pronto al correo proporcionado.
                                </p>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "px-8 py-3 rounded-full text-sm font-medium transition-all",
                                        isLight
                                            ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
                                            : "bg-neutral-800 hover:bg-neutral-700 text-white"
                                    )}
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
