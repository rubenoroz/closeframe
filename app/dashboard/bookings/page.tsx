"use client";

import React, { useEffect, useState, useCallback } from "react";
import BookingCalendar, { BookingEvent } from "@/components/booking/BookingCalendar";
import CalendarSettings from "@/components/booking/CalendarSettings";
import { X, Loader2, CalendarDays, UserCircle, Mail, FileText, Check, Trash2, Phone, MessageCircle, ExternalLink, Search, LayoutGrid, Settings, RefreshCw, Calendar } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { cn } from "@/lib/utils";

interface Booking {
    id: string;
    customerName: string;
    customerEmail: string;
    date: string;
    customerPhone?: string;
    notes?: string;
    status: string;
    endDate?: string;
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
    const [formData, setFormData] = useState({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        date: "",
        endDate: "",
        notes: "",
        status: "pending",
    });
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed">("all");
    const [viewMode, setViewMode] = useState<"calendar" | "list" | "combo">("calendar");
    const [searchTerm, setSearchTerm] = useState("");
    const [userPlan, setUserPlan] = useState<string>("free");
    const [showCalendarSettings, setShowCalendarSettings] = useState(false);
    const [externalEvents, setExternalEvents] = useState<BookingEvent[]>([]);

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, ''); // Remove non-numeric chars
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const fetchBookings = useCallback(async () => {
        try {
            const res = await fetch("/api/bookings");
            const data = await res.json();
            if (data.bookings) {
                setBookings(data.bookings);
            }
            if (data.plan) {
                setUserPlan(data.plan);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchExternalEvents = useCallback(async () => {
        try {
            // Fetch events for a wide range (e.g., current month +/- 1 month)
            // Ideally this should depend on the calendar view date
            const startStr = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
            const endStr = new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString();

            const res = await fetch(`/api/calendar/sync/events?start=${startStr}&end=${endStr}`);
            const data = await res.json();
            if (data.events) {
                setExternalEvents(data.events);
            }
        } catch (error) {
            console.error("Error fetching external events:", error);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
        fetchExternalEvents(); // Initial fetch
    }, [fetchBookings, fetchExternalEvents]);

    // Auto-sync logic
    useEffect(() => {
        const checkAndSync = async () => {
            try {
                // Get all accounts to check their settings
                const res = await fetch("/api/calendar/accounts");
                const data = await res.json();
                const accounts = data.accounts || [];

                for (const account of accounts) {
                    // Only sync if enabled and autoRefresh is on
                    if (account.syncEnabled && account.autoRefresh) {
                        const lastSync = account.lastSyncAt ? new Date(account.lastSyncAt).getTime() : 0;
                        const now = Date.now();
                        const intervalMs = (account.refreshInterval || 15) * 60 * 1000;

                        // If time elapsed > interval, trigger sync
                        if (now - lastSync > intervalMs) {
                            console.log(`[AutoSync] Triggering sync for account ${account.id}`);
                            await fetch("/api/calendar/sync", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ accountId: account.id })
                            });
                            // Refresh UI after sync
                            fetchExternalEvents();
                        }
                    }
                }
            } catch (error) {
                console.error("[AutoSync] Error checking accounts:", error);
            }
        };

        // Check every minute
        const intervalId = setInterval(checkAndSync, 60 * 1000);

        // Also run once on mount (delayed slightly to let initial load finish)
        const initialTimer = setTimeout(checkAndSync, 5000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(initialTimer);
        };
    }, [fetchExternalEvents]);

    // Convert bookings to calendar events with search filter
    const events: BookingEvent[] = bookings
        .filter(b => filterStatus === "all" || b.status === filterStatus)
        .filter(b => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                b.customerName.toLowerCase().includes(term) ||
                b.customerEmail.toLowerCase().includes(term) ||
                (b.customerPhone?.toLowerCase().includes(term)) ||
                (b.notes?.toLowerCase().includes(term))
            );
        })
        .map((b) => ({
            id: b.id,
            title: b.customerName,
            start: new Date(b.date),
            end: b.endDate ? new Date(b.endDate) : new Date(new Date(b.date).getTime() + 60 * 60 * 1000), // Use endDate or default to 1h
            customerName: b.customerName,
            customerEmail: b.customerEmail,
            customerPhone: b.customerPhone,
            notes: b.notes,
            status: b.status,
            endDate: b.endDate,
        }));

    // Combine local and external events with filtering
    const allEvents: BookingEvent[] = [
        ...events,
        ...externalEvents
            .map(e => ({
                id: e.id,
                title: e.title || "Ocupado",
                start: new Date(e.start),
                end: new Date(e.end),
                customerName: e.accountName || "Externo",
                customerEmail: "",
                customerPhone: "",
                status: "external",
                isExternal: true,
                provider: (e as any).provider,
                notes: (e as any).description || ""
            }))
            .filter(e => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                    e.title.toLowerCase().includes(term) ||
                    e.customerName?.toLowerCase().includes(term) ||
                    e.notes?.toLowerCase().includes(term)
                );
            })
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    // Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatToLocalISO = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60 * 1000);
        return localDate.toISOString().slice(0, 16);
    };

    const handleSlotSelect = ({ start, end }: { start: Date; end: Date }) => {
        setSelectedEvent(null);
        setFormData({
            customerName: "",
            customerEmail: "",
            customerPhone: "",
            date: formatToLocalISO(start),
            endDate: formatToLocalISO(end),
            notes: "",
            status: "confirmed", // Default to confirmed if created manually by admin
        });
        setShowModal(true);
    };

    const handleEventSelect = (event: BookingEvent) => {
        // Prevent editing external events for now, or show read-only modal
        if (event.isExternal) {
            // Optional: alert or simple toast, or just open modal in read-only mode.
            // For now let's just ignore or show a quick alert, 
            // but opening the modal with disabled fields is better UX.
            // Let's rely on the form being editable but submission failing? No.
            // Let's skip for now or better: show modal but disable save.
            // Since we don't have a "View Only" mode easily, we'll just not open it 
            // OR open it populated but user can't save.
            // Actually, let's open it. The user wants to "see" it.
        }

        setSelectedEvent(event);
        setFormData({
            customerName: event.customerName || event.title || "Evento Externo",
            customerEmail: event.customerEmail || "",
            customerPhone: event.customerPhone || "",
            date: formatToLocalISO(event.start),
            endDate: formatToLocalISO(event.end),
            notes: event.notes || "",
            status: event.status || "confirmed",
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedEvent?.isExternal) {
            alert("No se pueden editar eventos externos desde aquí.");
            return;
        }

        setSaving(true);

        try {
            // Ensure we send a proper ISO string that includes timezone info or is converted to UTC
            const submitData = {
                ...formData,
                date: new Date(formData.date).toISOString(),
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
                id: selectedEvent?.id // Include ID if editing
            };

            const method = selectedEvent ? "PATCH" : "POST";

            const res = await fetch("/api/bookings", {
                method,
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

        if (selectedEvent.isExternal) {
            alert("Para eliminar este evento, hazlo desde tu calendario externo (Google/Outlook) y sincroniza.");
            return;
        }

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

            {/* Status Filters / Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
                <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-4 py-2 rounded-full text-sm border transition ${filterStatus === "all" ? "bg-white text-black border-white" : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500"}`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilterStatus("pending")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition ${filterStatus === "pending" ? "bg-amber-500/10 text-amber-500 border-amber-500" : "bg-transparent text-neutral-400 border-neutral-700 hover:border-amber-500/50"}`}
                >
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Pendientes
                </button>
                <button
                    onClick={() => setFilterStatus("confirmed")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition ${filterStatus === "confirmed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500" : "bg-transparent text-neutral-400 border-neutral-700 hover:border-emerald-500/50"}`}
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmadas
                </button>
            </div>

            {/* Search and View Toggle Row */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search Bar */}
                <div className="flex items-center px-4 py-2.5 rounded-xl border bg-neutral-900 border-neutral-800 focus-within:border-emerald-500 transition-all flex-1 sm:max-w-xs">
                    <Search className="w-4 h-4 text-neutral-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Buscar reserva..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-500 text-white"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm("")}>
                            <X className="w-3 h-3 text-neutral-500 hover:text-neutral-300" />
                        </button>
                    )}
                </div>

                {/* View Toggle */}
                <div className="flex bg-neutral-900 rounded-lg p-1 w-fit border border-neutral-800">
                    <button
                        onClick={() => setViewMode("calendar")}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            viewMode === "calendar" ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                        )}
                    >
                        <CalendarDays className="w-4 h-4" /> <span className="hidden sm:inline">Calendario</span>
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            viewMode === "list" ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                        )}
                    >
                        <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Lista</span>
                    </button>
                    <button
                        onClick={() => setViewMode("combo")}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            viewMode === "combo" ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Ambos</span>
                    </button>
                </div>

                {/* Calendar Sync Button */}
                <button
                    onClick={() => setShowCalendarSettings(!showCalendarSettings)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                        showCalendarSettings
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500"
                            : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white"
                    )}
                >
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">Calendarios</span>
                </button>
            </div>

            {/* Calendar Settings Panel */}
            {showCalendarSettings && (
                <div className="mb-6">
                    <CalendarSettings />
                </div>
            )}

            {/* Calendar View */}
            {viewMode === "calendar" && (
                <BookingCalendar
                    events={allEvents}
                    onEventAdd={handleSlotSelect}
                    onEventSelect={handleEventSelect}
                />
            )}

            {/* List View */}
            {viewMode === "list" && (
                <BookingListTable events={allEvents} onEventSelect={handleEventSelect} />
            )}

            {/* Combo View: Calendar + List */}
            {viewMode === "combo" && (
                <div className="space-y-6">
                    {/* Compact Calendar */}
                    <div className="max-h-[400px] overflow-hidden rounded-2xl border border-neutral-800">
                        <BookingCalendar
                            events={allEvents}
                            onEventAdd={handleSlotSelect}
                            onEventSelect={handleEventSelect}
                        />
                    </div>
                    {/* List Below */}
                    <BookingListTable events={allEvents} onEventSelect={handleEventSelect} />
                </div>
            )}

            {/* Floating Add Button for Mobile */}
            <button
                onClick={() => {
                    setSelectedEvent(null);
                    setFormData({
                        customerName: "",
                        customerEmail: "",
                        customerPhone: "",
                        date: formatToLocalISO(new Date()),
                        endDate: formatToLocalISO(new Date()),
                        notes: "",
                        status: "confirmed",
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
                            {selectedEvent && selectedEvent.isExternal ? "Detalles del Evento Externo" : selectedEvent ? "Detalles de Reserva" : "Nueva Reserva"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                    <UserCircle className="w-4 h-4" /> {selectedEvent?.isExternal ? "Título" : "Nombre del Cliente"}
                                </label>
                                <input
                                    type="text"
                                    value={formData.customerName}
                                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                    required
                                    disabled={!!selectedEvent?.isExternal}
                                />
                            </div>

                            {!selectedEvent?.isExternal && (
                                <>
                                    <div>
                                        <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                            <Mail className="w-4 h-4" /> Email
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                value={formData.customerEmail}
                                                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                                required
                                            />
                                            {selectedEvent && (
                                                <a
                                                    href={`mailto:${formData.customerEmail}`}
                                                    target="_blank"
                                                    className="px-3 flex items-center justify-center bg-neutral-800 border border-neutral-700 rounded-xl hover:bg-neutral-700 text-white transition"
                                                    title="Enviar correo"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                            <Phone className="w-4 h-4" /> Teléfono
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="tel"
                                                value={formData.customerPhone}
                                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                                placeholder="+52..."
                                            />
                                            {selectedEvent && formData.customerPhone && (
                                                <button
                                                    type="button"
                                                    onClick={() => openWhatsApp(formData.customerPhone)}
                                                    className="px-3 flex items-center justify-center bg-green-600 rounded-xl hover:bg-green-500 text-white transition"
                                                    title="Abrir WhatsApp"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                        <CalendarDays className="w-4 h-4" /> Inicio
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                        required
                                        disabled={!!selectedEvent?.isExternal}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                        Fin
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                                        required
                                        disabled={!!selectedEvent?.isExternal}
                                    />
                                </div>
                            </div>

                            {!selectedEvent?.isExternal && (
                                <div>
                                    <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                        Estado
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: "pending" })}
                                            className={`flex-1 py-2 px-4 rounded-xl border text-sm transition ${formData.status === "pending"
                                                ? "bg-amber-500/10 border-amber-500 text-amber-500"
                                                : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                                }`}
                                        >
                                            Pendiente
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: "confirmed" })}
                                            className={`flex-1 py-2 px-4 rounded-xl border text-sm transition ${formData.status === "confirmed"
                                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                                : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                                }`}
                                        >
                                            Confirmada
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-neutral-400 flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4" /> {selectedEvent?.isExternal ? "Descripción" : "Notas"}
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition resize-none"
                                    disabled={!!selectedEvent?.isExternal}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                {selectedEvent && !selectedEvent.isExternal && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 px-4 py-3 bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50 transition"
                                    >
                                        <Trash2 className="w-4 h-4" /> Eliminar
                                    </button>
                                )}
                                {!selectedEvent?.isExternal && (
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
                                )}
                                {selectedEvent?.isExternal && (
                                    <div className="w-full text-center text-xs text-neutral-500">
                                        Sincronizado desde {selectedEvent.provider === 'google_calendar' ? 'Google Calendar' : 'Outlook'}. Gestionar en origen.
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Extracted List Table Component for reuse
function BookingListTable({
    events,
    onEventSelect
}: {
    events: BookingEvent[];
    onEventSelect: (event: BookingEvent) => void;
}) {
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-800/50">
                            <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-widest">Estado</th>
                            <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-widest">Fecha y Hora</th>
                            <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-widest">Cliente / Título</th>
                            <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-widest hidden md:table-cell">Contacto</th>
                            <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-widest hidden lg:table-cell">Notas</th>
                            <th className="p-4 text-xs font-medium text-neutral-400 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-neutral-500 text-sm">
                                    No hay reservas ni eventos externos en el rango seleccionado.
                                </td>
                            </tr>
                        ) : (
                            events
                                .sort((a, b) => a.start.getTime() - b.start.getTime())
                                .map((event) => (
                                    <tr key={event.id} className="hover:bg-neutral-800/30 transition-colors group">
                                        <td className="p-4">
                                            {event.isExternal ? (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                    event.provider === "google_calendar"
                                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                )}>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", event.provider === "google_calendar" ? "bg-red-500" : "bg-blue-500")} />
                                                    {event.provider === "google_calendar" ? "Google" : "Outlook"}
                                                </span>
                                            ) : (
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                    event.status === "confirmed"
                                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                )}>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", event.status === "confirmed" ? "bg-emerald-500" : "bg-amber-500")} />
                                                    {event.status === "confirmed" ? "Confirmada" : "Pendiente"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">
                                                    {event.start.toLocaleDateString("es-ES", { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </span>
                                                <span className="text-xs text-neutral-400">
                                                    {event.start.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                                                    {event.isExternal ? <CalendarDays className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
                                                </div>
                                                <span className="text-sm font-medium text-neutral-200">{event.customerName || event.title}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="space-y-1">
                                                {!event.isExternal && event.customerEmail && (
                                                    <a href={`mailto:${event.customerEmail}`} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors">
                                                        <Mail className="w-3 h-3" /> {event.customerEmail}
                                                    </a>
                                                )}
                                                {!event.isExternal && event.customerPhone && (
                                                    <a href={`https://wa.me/${event.customerPhone.replace(/\D/g, '')}`} target="_blank" className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-green-500 transition-colors">
                                                        <MessageCircle className="w-3 h-3" /> {event.customerPhone}
                                                    </a>
                                                )}
                                                {event.isExternal && (
                                                    <span className="text-xs text-neutral-500 italic">Externo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-[200px] hidden lg:table-cell">
                                            {event.notes ? (
                                                <p className="text-xs text-neutral-400 truncate" title={event.notes}>
                                                    {event.notes}
                                                </p>
                                            ) : (
                                                <span className="text-xs text-neutral-600 italic">Sin notas</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => onEventSelect(event)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white transition-colors border border-neutral-700"
                                            >
                                                {event.isExternal ? "Ver" : "Gestionar"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
