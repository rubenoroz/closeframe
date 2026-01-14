"use client";

import React, { useEffect, useState, useCallback } from "react";
import BookingCalendar, { BookingEvent } from "@/components/booking/BookingCalendar";
import { X, Loader2, CalendarDays, UserCircle, Mail, FileText, Check, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

interface Booking {
    id: string;
    customerName: string;
    customerEmail: string;
    date: string;
    notes?: string;
    status: string;
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
    const [formData, setFormData] = useState({
        customerName: "",
        customerEmail: "",
        date: "",
        notes: "",
    });
    const [saving, setSaving] = useState(false);

    const fetchBookings = useCallback(async () => {
        try {
            const res = await fetch("/api/bookings");
            const data = await res.json();
            if (data.bookings) {
                setBookings(data.bookings);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Convert bookings to calendar events
    const events: BookingEvent[] = bookings.map((b) => ({
        id: b.id,
        title: b.customerName,
        start: new Date(b.date),
        end: new Date(new Date(b.date).getTime() + 60 * 60 * 1000), // 1 hour duration
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        notes: b.notes,
        status: b.status,
    }));

    // Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatToLocalISO = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60 * 1000);
        return localDate.toISOString().slice(0, 16);
    };

    const handleSlotSelect = ({ start }: { start: Date; end: Date }) => {
        setSelectedEvent(null);
        setFormData({
            customerName: "",
            customerEmail: "",
            date: formatToLocalISO(start),
            notes: "",
        });
        setShowModal(true);
    };

    const handleEventSelect = (event: BookingEvent) => {
        setSelectedEvent(event);
        setFormData({
            customerName: event.customerName || "",
            customerEmail: event.customerEmail || "",
            date: formatToLocalISO(event.start),
            notes: event.notes || "",
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Ensure we send a proper ISO string that includes timezone info or is converted to UTC
            const submitData = {
                ...formData,
                date: new Date(formData.date).toISOString()
            };

            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitData),
            });

            if (res.ok) {
                setShowModal(false);
                fetchBookings();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedEvent) return;
        if (!confirm("¿Eliminar esta reserva?")) return;

        try {
            await fetch(`/api/bookings?id=${selectedEvent.id}`, { method: "DELETE" });
            setShowModal(false);
            fetchBookings();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                    <div>
                        <Skeleton className="h-8 md:h-10 w-36 md:w-48 mb-2" />
                        <Skeleton className="h-4 w-48 md:w-64" />
                    </div>
                    <Skeleton className="h-4 w-20 md:w-24" />
                </header>
                <Skeleton className="h-[500px] md:h-[600px] lg:h-[700px] w-full rounded-xl md:rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div>
                    <h1 className="text-xl md:text-3xl font-light mb-1 flex items-center gap-2 md:gap-3">
                        <CalendarDays className="w-5 h-5 md:w-8 md:h-8 text-emerald-500" />
                        Reservas
                    </h1>
                    <p className="text-neutral-500 text-xs md:text-sm">Gestiona tus sesiones.</p>
                </div>
                <div className="text-xs md:text-sm text-neutral-400">
                    {bookings.length} reserva{bookings.length !== 1 ? "s" : ""}
                </div>
            </header>

            <BookingCalendar
                events={events}
                onEventAdd={handleSlotSelect}
                onEventSelect={handleEventSelect}
            />

            {/* Floating Add Button for Mobile (touch events don't work well with react-big-calendar) */}
            <button
                onClick={() => {
                    setSelectedEvent(null);
                    setFormData({
                        customerName: "",
                        customerEmail: "",
                        date: formatToLocalISO(new Date()),
                        notes: "",
                    });
                    setShowModal(true);
                }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center text-2xl z-40 md:hidden transition-all active:scale-95"
                aria-label="Nueva reserva"
            >
                +
            </button>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-medium mb-6">
                            {selectedEvent ? "Detalles de Reserva" : "Nueva Reserva"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                    <UserCircle className="w-4 h-4" /> Nombre del Cliente
                                </label>
                                <input
                                    type="text"
                                    value={formData.customerName}
                                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                    <Mail className="w-4 h-4" /> Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.customerEmail}
                                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                    <CalendarDays className="w-4 h-4" /> Fecha y Hora
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4" /> Notas
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                {selectedEvent && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 px-4 py-3 bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50 transition"
                                    >
                                        <Trash2 className="w-4 h-4" /> Eliminar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition font-medium disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" /> Guardar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
