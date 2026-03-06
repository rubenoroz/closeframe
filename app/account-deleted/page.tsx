"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Home } from "lucide-react";
import { motion } from "framer-motion";

export default function AccountDeletedPage() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full text-center space-y-8"
            >
                <div className="flex justify-center">
                    <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl md:text-4xl font-light tracking-tight">Cuenta eliminada</h1>
                    <p className="text-neutral-400 text-lg">
                        Tu cuenta y todos tus datos asociados han sido eliminados con éxito. Lamentamos verte partir.
                    </p>
                </div>

                <div className="pt-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-neutral-200 transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        Volver al inicio
                    </Link>
                </div>
            </motion.div>

            <footer className="absolute bottom-8 text-neutral-600 text-sm">
                &copy; {new Date().getFullYear()} Closerlens. Todos los derechos reservados.
            </footer>
        </div>
    );
}
