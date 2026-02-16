"use client";

import Link from "next/link";
import React from "react";
import { UserNavButton } from "./UserNavButton";

interface PlanBNavbarProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
}

export function PlanBNavbar({ user }: PlanBNavbarProps) {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        setIsMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Prevent scroll when menu is open
    React.useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMenuOpen]);

    return (
        <>
            {/* Main Header */}
            <header className="fixed top-0 z-50 w-full bg-black/60 backdrop-blur-md border-b border-white/5 px-6 lg:px-20 py-4 font-[var(--font-spline)]">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="w-20 md:w-32">
                        <img src="/logo-white.svg" alt="CloserLens" className="w-full h-auto object-contain" />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-white p-2 focus:outline-none"
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
                        <UserNavButton user={user} />
                    </nav>
                </div>
            </header >

            {/* Mobile Menu - Separate from header */}
            {/* Overlay - Click to close */}
            <div
                className={`fixed inset-0 z-[60] bg-black/40 md:hidden transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Panel with Animation */}
            <div className={`fixed top-16 right-4 z-[70] w-48 bg-black/20 backdrop-blur-2xl rounded-2xl border border-white/10 p-4 md:hidden transition-all duration-300 ease-out origin-top-right ${isMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                <nav className="flex flex-col gap-1">
                    <a
                        className="text-right text-base font-light text-white hover:text-[#cdb8e1] py-2 px-3 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                        onClick={(e) => scrollToSection(e, 'features')}
                        href="#features"
                    >
                        Productos
                    </a>
                    <a
                        className="text-right text-base font-light text-white hover:text-[#cdb8e1] py-2 px-3 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                        onClick={(e) => scrollToSection(e, 'studio')}
                        href="#studio"
                    >
                        Experiencia
                    </a>
                    <a
                        className="text-right text-base font-light text-white hover:text-[#cdb8e1] py-2 px-3 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                        onClick={(e) => scrollToSection(e, 'pricing')}
                        href="#pricing"
                    >
                        Precios
                    </a>
                    <Link
                        className="text-right text-base font-light text-white hover:text-[#cdb8e1] py-2 px-3 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => setIsMenuOpen(false)}
                        href="/login"
                    >
                        Iniciar Sesión
                    </Link>
                </nav>
            </div>
        </>
    );
}
