"use client";

import Link from "next/link";
import React from "react";

export function PlanBNavbar() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        setIsMenuOpen(false); // Close menu on click
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header className="fixed top-0 z-50 w-full bg-black/60 backdrop-blur-md border-b border-white/5 px-6 lg:px-20 py-4 font-[var(--font-spline)]">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                <div className="w-32 md:w-40 relative z-50">
                    <img src="/logo-white.svg" alt="CloserLens" className="w-full h-auto object-contain" />
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white z-50 relative p-2"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span className="material-symbols-outlined text-3xl">
                        {isMenuOpen ? 'close' : 'menu'}
                    </span>
                </button>

                {/* Desktop Nav */}
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

                {/* Mobile Nav Overlay */}
                <div className={`fixed inset-0 bg-black/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-8 transition-all duration-300 md:hidden ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                    <a
                        className="text-2xl font-light text-white hover:text-[#cdb8e1] transition-colors"
                        onClick={(e) => scrollToSection(e, 'features')}
                        href="#features"
                    >
                        Productos
                    </a>
                    <a
                        className="text-2xl font-light text-white hover:text-[#cdb8e1] transition-colors"
                        onClick={(e) => scrollToSection(e, 'studio')}
                        href="#studio"
                    >
                        Experiencia
                    </a>
                    <a
                        className="text-2xl font-light text-white hover:text-[#cdb8e1] transition-colors"
                        onClick={(e) => scrollToSection(e, 'pricing')}
                        href="#pricing"
                    >
                        Precios
                    </a>
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                        <button className="bg-[#cdb8e1] text-black px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest mt-4">
                            Login
                        </button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
