"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Invitation {
    id: string;
    token: string;
    project: {
        name: string;
        owner: {
            name: string | null;
        }
    };
    sender: {
        name: string | null;
        image: string | null;
    };
}

export function InvitationList({ initialInvitations }: { initialInvitations: any[] }) {
    const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
    const router = useRouter();

    if (invitations.length === 0) return null;

    const handleAccept = async (token: string) => {
        try {
            const res = await fetch("/api/scena/invitations/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            if (!res.ok) throw new Error("Error al aceptar invitación");

            toast.success("Invitación aceptada correctamente");
            setInvitations(prev => prev.filter(i => i.token !== token));
            window.location.reload(); // Force full reload to update ProjectList
        } catch (error) {
            toast.error("Hubo un problema al unirse al proyecto");
        }
    };

    const handleDecline = async (id: string, token: string) => {
        try {
            const res = await fetch(`/api/scena/invitations/${id}`, {
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
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                Invitaciones Pendientes
            </h2>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {invitations.map((inv) => (
                    <div key={inv.id} className="bg-neutral-900 border border-indigo-500/30 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />

                        <div>
                            <p className="text-sm text-indigo-200 font-medium">Te han invitado a colaborar en:</p>
                            <h3 className="text-white font-bold text-lg leading-tight mt-1">{inv.project.name}</h3>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                            {inv.sender.image ? (
                                <img src={inv.sender.image} alt={inv.sender.name || ""} className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs text-white">
                                    {(inv.sender.name || "?")[0]}
                                </div>
                            )}
                            <span className="text-xs text-neutral-400">
                                Invitado por <span className="text-neutral-300">{inv.sender.name}</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <Button
                                size="sm"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => handleAccept(inv.token)}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Aceptar
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-neutral-700 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50"
                                onClick={() => handleDecline(inv.id, inv.token)}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Rechazar
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
