"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Mail, Network } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Invitation {
    id: string;
    token: string;
    project: {
        title: string;
        owner: {
            name: string | null;
        }
    };
    sender: {
        name: string | null;
        image: string | null;
    };
}

export function NodosInvitationList({ initialInvitations }: { initialInvitations: any[] }) {
    const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
    const router = useRouter();

    if (invitations.length === 0) {
        return (
            <div className="text-center py-32 rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/20">
                <p className="text-neutral-500 text-sm">No tienes invitaciones pendientes en este momento.</p>
            </div>
        );
    }

    const handleAccept = async (token: string) => {
        try {
            const res = await fetch("/api/nodos/invitations/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            if (!res.ok) throw new Error("Error al aceptar invitación");

            toast.success("Invitación aceptada correctamente");
            setInvitations(prev => prev.filter(i => i.token !== token));
            window.location.reload();
        } catch (error) {
            toast.error("Hubo un problema al unirse al proyecto");
        }
    };

    const handleDecline = async (id: string, token: string) => {
        try {
            // Re-using the same delete endpoint if we create it, or just filtering for now if not critical
            // For now, let's assume we might need a delete endpoint, matching Scena's invitations/[id]
            const res = await fetch(`/api/nodos/invitations/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Error al rechazar invitación");

            toast.success("Invitación rechazada");
            setInvitations(prev => prev.filter(i => i.token !== token));
            router.refresh();
        } catch (error) {
            toast.error("Hubo un problema al rechazar la invitación");
        }
    };

    return (
        <div className="py-4">
            <div className="flex flex-wrap gap-3">
                {invitations.map((inv) => (
                    <div
                        key={inv.id}
                        className="bg-[#111111] border border-neutral-800/60 p-3 rounded-2xl flex items-center gap-4 group hover:border-emerald-500/30 transition-all shadow-xl"
                    >
                        <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="relative">
                                {inv.sender.image ? (
                                    <img src={inv.sender.image} alt={inv.sender.name || ""} className="w-8 h-8 rounded-full border border-neutral-800" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 border border-neutral-700">
                                        {(inv.sender.name || "?")[0]}
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-[#111111]">
                                    <Mail className="w-2 h-2 text-white" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-white leading-tight truncate max-w-[150px]">
                                    {inv.project.title}
                                </h3>
                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                    Invitado por <span className="text-neutral-400">{inv.sender.name}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleAccept(inv.token)}
                                className="h-8 px-4 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white text-[11px] font-bold rounded-full transition-all flex items-center gap-1.5"
                            >
                                <Check className="w-3 h-3" />
                                Aceptar
                            </button>
                            <button
                                onClick={() => handleDecline(inv.id, inv.token)}
                                className="h-8 w-8 flex items-center justify-center rounded-full border border-neutral-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 text-neutral-500 transition-all"
                                title="Rechazar"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
