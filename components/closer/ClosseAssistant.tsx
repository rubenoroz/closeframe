"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ClosseAssistant = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
        { role: "bot", text: "¡Hola! Soy Closse, tu asistente de Closerlens. ¿En qué puedo ayudarte hoy?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Ocultar en galerías (/g/ o /p/ o /upload/)
    const isHidden = pathname?.startsWith("/g/") || pathname?.startsWith("/p/") || pathname?.startsWith("/upload/");

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (isHidden) return null;

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
        setIsLoading(true);

        const apiUrl = process.env.NEXT_PUBLIC_CHATBOT_URL || "https://rubenoroz-closse-api.hf.space/chat";
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg }),
            });

            if (!response.ok) throw new Error("API error");

            const data = await response.json();
            setMessages((prev) => [...prev, { role: "bot", text: data.response }]);
        } catch (error) {
            setMessages((prev) => [...prev, { role: "bot", text: "Lo siento, no puedo conectarme con mi cerebro en este momento. Inténtalo más tarde." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Botón Flotante Minimalista (Favicon) */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 p-3 rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl hover:bg-zinc-800 transition-all",
                    isOpen && "opacity-0 pointer-events-none"
                )}
            >
                <Image
                    src="/favicon-white.svg"
                    alt="Closse"
                    width={24}
                    height={24}
                    className="opacity-90"
                />
            </motion.button>

            {/* Panel Lateral (Drawer) */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[51]"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-800/50 z-[52] flex flex-col shadow-2xl"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                                        <Image src="/favicon-white.svg" alt="Closse" width={18} height={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-zinc-100 font-medium tracking-tight">Closse</h3>
                                        <p className="text-xs text-zinc-500">Asistente de Closerlens</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500 hover:text-zinc-300"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Chat Area */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
                            >
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex flex-col max-w-[85%]",
                                            msg.role === "user" ? "ml-auto items-end" : "items-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                                            msg.role === "user"
                                                ? "bg-zinc-100 text-zinc-950 rounded-tr-none"
                                                : "bg-zinc-900 text-zinc-200 border border-zinc-800/50 rounded-tl-none"
                                        )}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex items-start">
                                        <div className="bg-zinc-900 text-zinc-500 px-4 py-3 rounded-2xl rounded-tl-none border border-zinc-800/50">
                                            <Loader2 size={16} className="animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800/50">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                        placeholder="Escribe un mensaje..."
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-12 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        className="absolute right-2 top-1.5 p-2 bg-zinc-100 text-zinc-950 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!input.trim() || isLoading}
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-4 text-center">
                                    Closse puede cometer errores. Verifica la información importante.
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default ClosseAssistant;
