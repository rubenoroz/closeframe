"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Calendar, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Booking {
    id: string;
    customerName: string;
    date: string;
    notes: string | null;
}

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProjectCreated?: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [bookingId, setBookingId] = useState<string>("");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchBookings();
        }
    }, [isOpen]);

    const fetchBookings = async () => {
        setLoadingBookings(true);
        try {
            const res = await fetch("/api/bookings");
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
            }
        } catch (err) {
            console.error("Error fetching bookings:", err);
        } finally {
            setLoadingBookings(false);
        }
    };

    const handleBookingChange = (id: string) => {
        setBookingId(id);
        if (id) {
            const booking = bookings.find(b => b.id === id);
            if (booking) {
                // Auto-fill description if empty or user wants to overwrite
                const dateStr = new Date(booking.date).toLocaleDateString();
                const bookingInfo = `Cliente: ${booking.customerName}\nFecha: ${dateStr}\nNotas: ${booking.notes || 'Ninguna'}`;

                if (!description || confirm("¿Deseas reemplazar la descripción con los datos de la reserva?")) {
                    setDescription(bookingInfo);
                }

                if (!name) {
                    setName(`Proyecto - ${booking.customerName}`);
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/scena/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    description,
                    bookingId: bookingId || null,
                }),
            });

            if (!res.ok) {
                throw new Error("Error al crear el proyecto");
            }

            const project = await res.json();

            if (onProjectCreated) {
                onProjectCreated();
            } else {
                router.push(`/dashboard/scena/${project.id}`);
            }
            onClose();
        } catch (err) {
            setError("No se pudo crear el proyecto. Intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Nuevo Proyecto</h2>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Booking Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Vincular Reserva (Opcional)
                            </label>
                            <select
                                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={bookingId}
                                onChange={(e) => handleBookingChange(e.target.value)}
                                disabled={loadingBookings}
                            >
                                <option value="">-- Seleccionar Reserva del Calendario --</option>
                                {bookings.map((booking) => (
                                    <option key={booking.id} value={booking.id}>
                                        {new Date(booking.date).toLocaleDateString()} - {booking.customerName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Nombre del Proyecto <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Boda Juan y María"
                                className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Descripción / Notas
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalles del proyecto..."
                                className="w-full h-24 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={isSubmitting || !name}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    "Crear Proyecto"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
