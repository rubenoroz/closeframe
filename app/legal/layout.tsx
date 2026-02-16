import Link from "next/link";
import { cn } from "@/lib/utils";

const legalLinks = [
    { name: "Términos y Condiciones", href: "/legal/terminos_y_condiciones_closerlens" },
    { name: "Política de Privacidad", href: "/legal/politica_de_privacidad_closerlens" },
    { name: "Política de Cookies", href: "/legal/politica_de_cookies_closerlens" },
    { name: "Uso Aceptable", href: "/legal/politica_de_uso_aceptable_closerlens" },
    { name: "Derechos de Autor", href: "/legal/politica_de_derechos_de_autor_closerlens" },
    { name: "Pagos y Reembolsos", href: "/legal/politica_de_pagos_y_reembolsos_closerlens" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200">
            <div className="container mx-auto px-4 py-12 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8 md:gap-12">
                    {/* Sidebar Navigation */}
                    <aside className="space-y-6">
                        <div className="sticky top-24">
                            <h2 className="text-sm font-semibold mb-4 text-white uppercase tracking-wider px-3">Legal</h2>
                            <nav className="flex flex-col space-y-1">
                                {legalLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-all py-2 px-3 rounded-lg flex items-center gap-2 group"
                                    >
                                        <div className="w-1 h-1 rounded-full bg-neutral-700 group-hover:bg-emerald-500 transition-colors" />
                                        {link.name}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <main className="min-h-[60vh]">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
