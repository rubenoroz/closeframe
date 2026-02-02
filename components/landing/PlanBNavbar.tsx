"use client";

import Link from "next/link";
import React from "react";

export function PlanBNavbar() {
    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header className="fixed top-0 z-50 w-full bg-black/60 backdrop-blur-md border-b border-white/5 px-6 lg:px-20 py-4">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                <div className="w-40 relative">
                    <img src="/logo-white.svg" alt="CloserLens" className="w-full h-auto object-contain" />
                </div>
                <nav className="hidden md:flex items-center gap-10">
                    <a
                        className="text-xs font-bold tracking-widest uppercase hover:text-[#cdb8e1] transition-colors cursor-pointer"
                        onClick={(e) => scrollToSection(e, 'features')}
                        href="#features"
                    >
                        Productos
                    </a>
                    <a
                        className="text-xs font-bold tracking-widest uppercase hover:text-[#cdb8e1] transition-colors cursor-pointer"
                        onClick={(e) => scrollToSection(e, 'studio')}
                        href="#studio"
                    >
                        Experiencia
                    </a>
                    <a
                        className="text-xs font-bold tracking-widest uppercase hover:text-[#cdb8e1] transition-colors cursor-pointer"
                        onClick={(e) => scrollToSection(e, 'pricing')}
                        href="#pricing"
                    >
                        Precios
                    </a>
                    <Link href="/login">
                        <button className="bg-white text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#cdb8e1] transition-all">
                            Login
                        </button>
                    </Link>
                </nav>
            </div>
        </header>
    );
}
