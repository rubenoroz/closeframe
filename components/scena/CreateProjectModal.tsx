"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Calendar, Loader2, Check, ChevronsUpDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface Booking {
    id: string;
    customerName: string;
    date: string;
    notes: string | null;
}

interface ExternalEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    isExternal: boolean;
    provider: string;
    description?: string;
}

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProjectCreated?: () => void;
}

// Extended Booking type or union
type BookingOrEvent = (Booking & { isExternal?: false }) | (ExternalEvent & { isExternal: true });

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedId, setSelectedId] = useState<string>(""); // Generic ID

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [internalBookings, setInternalBookings] = useState<Booking[]>([]);
    const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([]);

    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Parallel fetch
            const [bookingsRes, eventsRes] = await Promise.all([
                fetch("/api/bookings"),
                fetch("/api/calendar/sync/events?start=" + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() + "&end=" + new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()) // Fetch recent past and future
            ]);

            if (bookingsRes.ok) {
                const data = await bookingsRes.json();
                setInternalBookings(data.bookings || []);
            }

            if (eventsRes.ok) {
                const data = await eventsRes.json();
                setExternalEvents(data.events || []);
            }

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectionChange = (id: string) => {
        setSelectedId(id);

        // Auto-close and clear search if selecting
        if (id) {
            setIsDropdownOpen(false);
            setSearchTerm("");
        }

        if (!id) return;

        // Find in internal first
        const booking = internalBookings.find(b => b.id === id);
        if (booking) {
            const dateStr = new Date(booking.date).toLocaleDateString();
            const info = `Cliente: ${booking.customerName}\nFecha: ${dateStr}\nNotas: ${booking.notes || 'Ninguna'}`;

            if (!description || confirm("¿Usar descripción de la reserva?")) {
                setDescription(info);
            }
            if (!name) setName(`Proyecto - ${booking.customerName}`);
            return;
        }

        // Find in external
        const event = externalEvents.find(e => e.id === id);
        if (event) {
            const dateStr = new Date(event.start).toLocaleDateString();
            const info = `Evento Externo: ${event.title}\nFecha: ${dateStr}\nNotas: ${event.description || 'Sin descripción'}`;

            if (!description || confirm("¿Usar descripción del evento externo?")) {
                setDescription(info);
            }
            if (!name) setName(`Proyecto - ${event.title}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Determine if it's internal or external ID selected
            const isInternal = internalBookings.some(b => b.id === selectedId);
            const isExternal = externalEvents.some(e => e.id === selectedId);

            const payload: any = {
                name,
                description,
            };

            if (isInternal) {
                payload.bookingId = selectedId;
            } else if (isExternal) {
                payload.externalEventId = selectedId;
            }

            const res = await fetch("/api/scena/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Error al crear el proyecto");
            }

            const project = await res.json();

            if (onProjectCreated) {
                onProjectCreated();
            } else {
                router.push(`/dashboard/scena/${project.id}`);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || "No se pudo crear el proyecto.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived state for filtering
    const filteredInternal = internalBookings.filter(b => {
        const term = searchTerm.toLowerCase();
        return b.customerName.toLowerCase().includes(term) || new Date(b.date).toLocaleDateString().includes(term);
    });

    const filteredExternal = externalEvents.filter(e => {
        const term = searchTerm.toLowerCase();
        return e.title.toLowerCase().includes(term) || new Date(e.start).toLocaleDateString().includes(term);
    });

    const getSelectedLabel = () => {
        if (!selectedId) return "-- Seleccionar --";

        const booking = internalBookings.find(b => b.id === selectedId);
        if (booking) return `${new Date(booking.date).toLocaleDateString()} - ${booking.customerName}`;

        const event = externalEvents.find(e => e.id === selectedId);
        if (event) return `${new Date(event.start).toLocaleDateString()} - ${event.title} (${event.provider === 'google_calendar' ? 'Google' : 'Outlook'})`;

        return "-- Seleccionar --";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Nuevo Proyecto</h2>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Vincular Reserva / Evento (Opcional)
                            </label>

                            {/* Custom Searchable Select */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => !loading && setIsDropdownOpen(!isDropdownOpen)}
                                    disabled={loading}
                                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none flex items-center justify-between text-left"
                                >
                                    <span className="truncate">{getSelectedLabel()}</span>
                                    <ChevronsUpDown className="w-4 h-4 text-neutral-500 opacity-50 shrink-0 ml-2" />
                                </button>

                                {isDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                            {/* Search Input */}
                                            <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
                                                <div className="flex items-center px-2 py-1.5 bg-neutral-100 dark:bg-neutral-800/50 rounded-md border border-transparent focus-within:border-emerald-500/50 transition-colors">
                                                    <Search className="w-3.5 h-3.5 text-neutral-400 mr-2 shrink-0" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre o fecha..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="bg-transparent border-none outline-none text-xs w-full placeholder:text-neutral-500 text-neutral-900 dark:text-white"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            {/* Options List */}
                                            <div className="overflow-y-auto flex-1 p-1 space-y-1">
                                                <button
                                                    type="button"
                                                    onClick={() => { handleSelectionChange(""); setIsDropdownOpen(false); }}
                                                    className="w-full px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-left text-neutral-500 transition-colors"
                                                >
                                                    -- Ninguna --
                                                </button>

                                                {(filteredInternal.length === 0 && filteredExternal.length === 0) && (
                                                    <div className="px-2 py-4 text-center text-xs text-neutral-400 italic">
                                                        No se encontraron resultados
                                                    </div>
                                                )}

                                                {filteredInternal.length > 0 && (
                                                    <div className="pt-1">
                                                        <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Reservas Internas</div>
                                                        {filteredInternal.map((b) => (
                                                            <button
                                                                key={b.id}
                                                                type="button"
                                                                onClick={() => { handleSelectionChange(b.id); }}
                                                                className={`w-full px-2 py-1.5 text-sm rounded flex items-center justify-between transition-colors text-left ${selectedId === b.id ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'}`}
                                                            >
                                                                <span className="truncate">{new Date(b.date).toLocaleDateString()} - {b.customerName}</span>
                                                                {selectedId === b.id && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {filteredExternal.length > 0 && (
                                                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-1">
                                                        <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Calendarios Externos</div>
                                                        {filteredExternal.map((e) => (
                                                            <button
                                                                key={e.id}
                                                                type="button"
                                                                onClick={() => { handleSelectionChange(e.id); }}
                                                                className={`w-full px-2 py-1.5 text-sm rounded flex items-center justify-between transition-colors text-left ${selectedId === e.id ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'}`}
                                                            >
                                                                <div className="flex flex-col truncate">
                                                                    <span className="truncate">{new Date(e.start).toLocaleDateString()} - {e.title}</span>
                                                                    <span className="text-[10px] opacity-70">{e.provider === 'google_calendar' ? 'Google' : 'Outlook'}</span>
                                                                </div>
                                                                {selectedId === e.id && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

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
