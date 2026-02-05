
"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function DisconnectButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDisconnect = async () => {
        if (!confirm("¿Estás seguro de que quieres desconectar tu cuenta de Stripe? Dejarás de recibir pagos.")) return;

        setLoading(true);
        try {
            await fetch("/api/stripe/connect/disconnect", { method: "POST" });
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Error al desconectar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition text-sm border border-red-500/20 flex items-center gap-2"
        >
            <LogOut className="w-3 h-3" />
            {loading ? "..." : "Desconectar"}
        </button>
    );
}
