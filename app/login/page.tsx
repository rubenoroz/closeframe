"use client";

import { signIn } from "next-auth/react";
import { Camera, Mail, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            // "resend" matches the provider ID in auth.config.ts
            const result = await signIn("resend", { email, callbackUrl: "/dashboard", redirect: false });

            if (result?.error) {
                console.error("Login error result:", result.error);
                alert("Error al enviar correo: " + result.error);
            } else if (result?.ok) {
                setEmailSent(true);
            }
        } catch (error) {
            console.error("Login exception:", error);
            alert("Error inesperado intentando ingresar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setIsGoogleLoading(true);
        signIn("google", { callbackUrl: "/dashboard" });
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo */}
                <div className="flex flex-col items-center mb-8 md:mb-10">
                    <div className="mb-2 md:mb-4 relative w-72 h-32 md:w-96 md:h-40">
                        <Image
                            src="/logo-white.svg"
                            alt="Closerlens"
                            fill
                            className="object-contain object-bottom"
                            priority
                        />
                    </div>
                    <p className="text-neutral-500 text-xs md:text-sm text-center">Plataforma de Galerías Profesionales</p>
                </div>

                {/* Card */}
                <div className="bg-neutral-900/50 border border-neutral-800 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/50">

                    {emailSent ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-medium text-white mb-2">¡Enlace enviado!</h2>
                            <p className="text-neutral-400 text-sm mb-6">
                                Hemos enviado un enlace mágico a <strong className="text-white">{email}</strong>.<br />
                                Haz clic en el enlace para iniciar sesión.
                            </p>
                            <button
                                onClick={() => setEmailSent(false)}
                                className="text-sm text-neutral-500 hover:text-white transition underline"
                            >
                                Usar otro correo
                            </button>
                        </motion.div>
                    ) : (
                        <>
                            <h1 className="text-lg md:text-xl font-medium text-center mb-2 text-white">Bienvenido</h1>
                            <p className="text-neutral-400 text-xs md:text-sm text-center mb-8">
                                Inicia sesión para gestionar tus galerías.
                            </p>

                            {/* Google Button */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isGoogleLoading || isLoading}
                                className="w-full flex items-center justify-center gap-3 px-5 md:px-6 py-3.5 bg-white text-black font-medium rounded-xl hover:bg-neutral-200 transition text-sm md:text-base disabled:opacity-70 disabled:cursor-not-allowed mb-6 group"
                            >
                                {isGoogleLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                )}
                                <span>Continuar con Google</span>
                            </button>

                            <div className="relative flex items-center justify-center mb-6">
                                <div className="absolute w-full h-[1px] bg-neutral-800"></div>
                                <span className="relative bg-[#0d0d0d] px-3 text-xs text-neutral-500 uppercase tracking-widest">o con email</span>
                            </div>

                            {/* Email Form */}
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="sr-only">Correo electrónico</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="tu@email.com"
                                            className="block w-full pl-10 pr-3 py-3 border border-neutral-700 rounded-xl leading-5 bg-neutral-800/50 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 sm:text-sm transition-colors"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || isGoogleLoading || !email}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-neutral-800 border border-neutral-700 text-white font-medium rounded-xl hover:bg-neutral-700 hover:border-neutral-600 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                    ) : (
                                        <>
                                            Enviar enlace mágico
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-neutral-400 group-hover:text-white" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Terms */}
                <p className="text-[10px] md:text-xs text-neutral-600 text-center mt-6">
                    Al iniciar sesión, aceptas nuestros términos y condiciones.
                </p>

                {/* Back to Home */}
                <div className="text-center mt-6">
                    <a href="/" className="text-xs md:text-sm text-neutral-500 hover:text-white transition">
                        ← Volver al inicio
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
