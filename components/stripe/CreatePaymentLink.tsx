
"use client";

import { useState } from "react";
import { Loader2, Link as LinkIcon, Copy, Check } from "lucide-react";

export function CreatePaymentLink() {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [currency, setCurrency] = useState("usd");
    const [loading, setLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setGeneratedUrl(null);

        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: parseFloat(amount), description, currency }),
            });

            const data = await res.json();
            if (data.url) {
                setGeneratedUrl(data.url);
            } else {
                alert("Error: " + (data.error || "Unknown"));
            }
        } catch (error) {
            console.error(error);
            alert("Error creating link");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedUrl) return;
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-emerald-500" />
                Crear Enlace de Cobro
            </h3>

            {!generatedUrl ? (
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm text-neutral-400 mb-1">Concepto</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej. Sesión de Retrato"
                            className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white placeholder-neutral-600 focus:ring-2 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">Monto</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white placeholder-neutral-600 focus:ring-2 focus:ring-emerald-500"
                                required
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">Moneda</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="usd">USD ($)</option>
                                <option value="mxn">MXN ($)</option>
                                <option value="eur">EUR (€)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generar Link"}
                    </button>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-emerald-400 text-sm font-medium mb-2">¡Enlace listo!</p>
                        <div className="flex items-center gap-2 bg-neutral-950/50 rounded-lg p-2 border border-emerald-500/30">
                            <input
                                type="text"
                                value={generatedUrl}
                                readOnly
                                className="bg-transparent border-none text-neutral-300 text-sm w-full focus:ring-0"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="p-2 hover:bg-emerald-500/20 rounded-md transition text-emerald-400"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => { setGeneratedUrl(null); setAmount(""); setDescription(""); }}
                        className="w-full text-neutral-400 hover:text-white text-sm"
                    >
                        Crear otro cobro
                    </button>
                </div>
            )}
        </div>
    );
}
