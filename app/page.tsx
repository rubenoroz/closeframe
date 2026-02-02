import React from "react";
import { prisma } from "@/lib/db";
import { PlanBNavbar } from "@/components/landing/PlanBNavbar";
import { PricingSection } from "@/components/landing/PricingSection";
// We don't use next/image yet to keep compatibility with provided external URLs for the prototype
/* eslint-disable @next/next/no-img-element */



import Image from "next/image";

export default async function PlanBPage() {
    const plans = await prisma.plan.findMany({
        orderBy: { sortOrder: 'asc' },
        where: { isActive: true }
    });
    return (
        <div className="bg-[#0a0a0a] font-[var(--font-spline)] text-white transition-colors duration-300 antialiased overflow-x-hidden min-h-screen">
            <div className="relative flex flex-col w-full">
                {/* Header */}
                <PlanBNavbar />

                {/* Hero Section */}
                <section className="relative h-screen flex items-center pt-20 px-6 lg:px-20 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="/hero-photographer.jpg"
                            alt="Photographer taking a photo"
                            fill
                            className="object-cover scale-110 blur-[2px] opacity-60"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/20 to-[#0a0a0a]"></div>
                    </div>
                    <div className="relative z-10 max-w-[1400px] mx-auto w-full">
                        <div className="max-w-4xl">
                            <span className="inline-block px-4 py-1 mb-8 rounded-full bg-[#cdb8e1]/20 border border-[#cdb8e1]/30 text-[#cdb8e1] text-[10px] font-bold tracking-[0.2em] uppercase">FOTOGRAFOS · ACTORES · MODELOS · MÚSICOS · FAMILIAS · STUDIOS · AGENCIAS</span>
                            <h1 className="font-serif text-5xl md:text-7xl lg:text-[120px] font-light text-white mb-8 leading-[0.9] md:leading-[0.85] tracking-tight">
                                Tu nube, <br /><span className="italic text-[#cdb8e1] ml-0 md:ml-20">tu galería.</span>
                            </h1>
                            <div className="flex flex-col md:flex-row md:items-end gap-8">
                                <p className="text-xl md:text-2xl text-white/60 max-w-xl leading-relaxed font-light">
                                    Closerlens transforma tu almacenamiento en galerías premium, flujos de trabajo y experiencias para tus clientes. <span className="text-white">tu respaldo, su galería.</span>
                                </p>
                                <div className="flex gap-4">
                                    <button className="bg-[#cdb8e1] text-black h-16 px-10 rounded-full text-sm font-bold tracking-widest uppercase hover:scale-105 transition-all">
                                        Empezar Ahora
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Scroll Section */}
                <section className="py-32 bg-[#0a0a0a] overflow-hidden" id="features">
                    <div className="max-w-[1400px] mx-auto px-6 lg:px-20 mb-16">
                        <div className="w-32 md:w-96 mb-2">
                            <img src="/logo-white.svg" alt="CloserLens" className="w-full h-auto object-contain" />
                        </div>
                        <h3 className="text-3xl md:text-5xl font-light text-[#cdb8e1] mb-2 tracking-tight leading-none">Más cerca. Más claro. Más tuyo.</h3>
                        <p className="text-white/40 text-xl font-light max-w-2xl leading-tight">Experiencias visuales creadas desde tu nube.</p>
                    </div>
                    <div className="space-y-2">
                        {/* Row 1: Right Scroll */}
                        <div className="relative overflow-hidden group">
                            <div className="flex gap-3 w-fit py-2 animate-scroll-right hover:[animation-play-state:paused]">
                                {/* Original Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpXkC43P7GKmeVa5AcqrrB26_6yYZyxZKbQ4Rkv-yUDS1MhQ0_pOQUUJVTggKws6Ar7vTDCGnwzopT8ZS3WztFsQ3DSwug8wntoPR1kZQa2rrufhb28ISGkYfaCgAHSVJN-3sFzet2wvbDYbyjHm1z72TK3gK1ArdLukJiTfnRBoArSDYOj3_xsR2l2hdHZirioU3L0jv9fw7ULyAOZpfyvGw_hDKwGWDqb3OxaFFlQqlqjkegRkYpMtxtR-lb5Xvg0TIM8PXnilM" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-white/5 backdrop-blur-xl border border-white/10 group">
                                    <div className="absolute top-8 left-8 flex gap-2">
                                        <div className="size-2 rounded-full bg-blue-500"></div>
                                        <div className="size-2 rounded-full bg-blue-500/40"></div>
                                    </div>
                                    <span className="material-symbols-outlined text-[#cdb8e1] text-5xl mb-6">collections_bookmark</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Galerías Closer</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">Transforma tus carpetas en experiencias visuales de alto impacto.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px] bg-black/60 p-8 border border-white/10">
                                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-3">
                                            <img alt="Drive" className="size-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6hDuD35H0iOySf7pud9NCJ5TBpoh7FdvsAksXM7iEKqvzD826Z_s1jl--IF1_cGR2WPp4n5nQHTjMX6eT7MDmd3QuWddwXXCiz01uNEaOqA8NZ_pPUUzLYRvnCIHqdN3a4hNyKSciSYij8_V-YnTZ4VDrXk6poaKSr9pW5EKipLU-BsGyc_z-DdkCCK4-LAXA0UmFgFtjetj4if4FtP6EfWIZTOxun6dOkFQ7BJOV1YwtHeWO3gVWlEa-Xqpszx0nULeQN5dOjEI" />
                                            <span className="text-xs font-bold tracking-widest uppercase text-white/40">Google Drive Sync</span>
                                        </div>
                                        <span className="text-[10px] text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded">CONNECTED</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl">
                                            <span className="material-symbols-outlined text-blue-400">image</span>
                                            <div className="flex-1">
                                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full w-3/4 bg-[#cdb8e1] animate-pulse"></div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-white/40">75%</span>
                                        </div>
                                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl opacity-50">
                                            <span className="material-symbols-outlined text-blue-400">image</span>
                                            <div className="flex-1"><div className="h-1.5 w-1/2 bg-white/10 rounded-full"></div></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Studio" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4jyKiTJRi1xH4_X6VdTyoj0odZaeaIXSfPgtN1SvQwq8zVsc6EhOP52ldQBkGmy0xVU-3tUNOIxz1fStfGM2GDGe5s-ZlXJHmyS9b8XSoQaR2aiUf4F5CrK9Ba0NE7J6iaaI2STcqPPoKRfK_JBqxyHeqwyKWOhxWU2qIdVz-OAD7dmC37vx-S4zcnCSbc230B0O5vxnEeS8piJANNxQz5C1KV7E4TFjWJUjfjRfYSbZHjMwlw4UrFN-DHXe21cXNA_5XGpZVWbs" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-[#cdb8e1]/10 border border-[#cdb8e1]/20 backdrop-blur-xl">
                                    <span className="material-symbols-outlined text-[#cdb8e1] text-5xl mb-6">event</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Agenda tus eventos</h3>
                                    <p className="text-white/70 text-sm leading-relaxed">Administra tu calendario y sesiones con un sistema de reservas integrado.</p>
                                </div>

                                {/* Duplicate Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpXkC43P7GKmeVa5AcqrrB26_6yYZyxZKbQ4Rkv-yUDS1MhQ0_pOQUUJVTggKws6Ar7vTDCGnwzopT8ZS3WztFsQ3DSwug8wntoPR1kZQa2rrufhb28ISGkYfaCgAHSVJN-3sFzet2wvbDYbyjHm1z72TK3gK1ArdLukJiTfnRBoArSDYOj3_xsR2l2hdHZirioU3L0jv9fw7ULyAOZpfyvGw_hDKwGWDqb3OxaFFlQqlqjkegRkYpMtxtR-lb5Xvg0TIM8PXnilM" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-white/5 backdrop-blur-xl border border-white/10 group">
                                    <div className="absolute top-8 left-8 flex gap-2">
                                        <div className="size-2 rounded-full bg-blue-500"></div>
                                        <div className="size-2 rounded-full bg-blue-500/40"></div>
                                    </div>
                                    <span className="material-symbols-outlined text-[#cdb8e1] text-5xl mb-6">collections_bookmark</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Galerías Closer</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">Transforma tus carpetas en experiencias visuales de alto impacto.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px] bg-black/60 p-8 border border-white/10">
                                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-3">
                                            <img alt="Drive" className="size-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6hDuD35H0iOySf7pud9NCJ5TBpoh7FdvsAksXM7iEKqvzD826Z_s1jl--IF1_cGR2WPp4n5nQHTjMX6eT7MDmd3QuWddwXXCiz01uNEaOqA8NZ_pPUUzLYRvnCIHqdN3a4hNyKSciSYij8_V-YnTZ4VDrXk6poaKSr9pW5EKipLU-BsGyc_z-DdkCCK4-LAXA0UmFgFtjetj4if4FtP6EfWIZTOxun6dOkFQ7BJOV1YwtHeWO3gVWlEa-Xqpszx0nULeQN5dOjEI" />
                                            <span className="text-xs font-bold tracking-widest uppercase text-white/40">Google Drive Sync</span>
                                        </div>
                                        <span className="text-[10px] text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded">CONNECTED</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl">
                                            <span className="material-symbols-outlined text-blue-400">image</span>
                                            <div className="flex-1">
                                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full w-3/4 bg-[#cdb8e1] animate-pulse"></div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-white/40">75%</span>
                                        </div>
                                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl opacity-50">
                                            <span className="material-symbols-outlined text-blue-400">image</span>
                                            <div className="flex-1"><div className="h-1.5 w-1/2 bg-white/10 rounded-full"></div></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Studio" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4jyKiTJRi1xH4_X6VdTyoj0odZaeaIXSfPgtN1SvQwq8zVsc6EhOP52ldQBkGmy0xVU-3tUNOIxz1fStfGM2GDGe5s-ZlXJHmyS9b8XSoQaR2aiUf4F5CrK9Ba0NE7J6iaaI2STcqPPoKRfK_JBqxyHeqwyKWOhxWU2qIdVz-OAD7dmC37vx-S4zcnCSbc230B0O5vxnEeS8piJANNxQz5C1KV7E4TFjWJUjfjRfYSbZHjMwlw4UrFN-DHXe21cXNA_5XGpZVWbs" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-[#cdb8e1]/10 border border-[#cdb8e1]/20 backdrop-blur-xl">
                                    <span className="material-symbols-outlined text-[#cdb8e1] text-5xl mb-6">event</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Agenda tus eventos</h3>
                                    <p className="text-white/70 text-sm leading-relaxed">Administra tu calendario y sesiones con un sistema de reservas integrado.</p>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Left Scroll */}
                        <div className="relative overflow-hidden group">
                            <div className="flex gap-3 w-fit py-2 animate-scroll-left hover:[animation-play-state:paused]">
                                {/* Original Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[480px] bg-white/5 backdrop-blur-xl border border-white/10 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/40 italic">Organiza tus proyectos</span>
                                        <div className="flex -space-x-2">
                                            <div className="size-6 rounded-full bg-[#cdb8e1] border-2 border-black"></div>
                                            <div className="size-6 rounded-full bg-blue-400 border-2 border-black"></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-2">
                                            <div className="text-[9px] uppercase font-bold text-white/30">Ready</div>
                                            <div className="h-24 bg-white/5 rounded-2xl border border-white/10 p-2">
                                                <div className="h-full w-full bg-white/5 rounded-lg"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[9px] uppercase font-bold text-[#cdb8e1]">Retouching</div>
                                            <div className="h-24 bg-[#cdb8e1]/10 rounded-2xl border border-[#cdb8e1]/20 p-2">
                                                <div className="h-full w-full bg-[#cdb8e1]/10 rounded-lg"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[9px] uppercase font-bold text-white/30">Delivered</div>
                                            <div className="h-24 bg-white/5 rounded-2xl border border-white/10 p-2"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Event" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC41p8R7-woErTUg9JzHCERhIvnIPxxJ5qyN4k3rZLvErQkXtekziJ0vSLJkMvLg_EdoAYj4ROOGiOMiOgT-Yrxmd_Qv5tW3pfIV9wa31ggsaMSRURWDRCaNnbwAIpbBI5b2pCYRiZ_-QbFe0Mrr0Mdv9v8VHoLsSk8cur3z3zsVP4OYFUpljx6duMRsUNJgbjmrMLksVXJSUY2xz25B7sFUFjblQRXrxnclw2r8c65NrxGgL3wtvJ23SM8RIyekoiTinBlog3VFeg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] bg-white/5 backdrop-blur-xl border border-white/10 p-0 flex flex-col">
                                    <div className="flex-1 flex items-center justify-center relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                                        <div className="z-10 text-center">
                                            <div className="size-20 bg-[#cdb8e1] rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-[#cdb8e1]/20">
                                                <span className="material-symbols-outlined text-black text-4xl">music_note</span>
                                            </div>
                                            <p className="font-bold text-xl mb-1">Música y Tipografía</p>
                                            <p className="text-[10px] text-white/40 tracking-[0.4em] uppercase">Personalización Total</p>
                                        </div>
                                    </div>
                                    <div className="h-1 bg-white/10 w-full"><div className="h-full w-1/3 bg-[#cdb8e1]"></div></div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Portrait Photography" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhIOTWnXZB4Yo4E2uRwFLYQgWFCBVlPbsNQuRwXD9CSsaiErKRNztcvhl4IltGg99l7nQBN8g1AeMWpH_eYiPxB9KQ4m6EHYSE31PrlI7KFktTnZOMZrYB27JKP-krOygGqQeEA2mBnQp8U61kWYQ9ySlNVvvCS4OBrNTKWOs-h9k93mkQMgiGtIiqwPMms9Ovn8w-PcEWQTqMbdK8uk1Dtd-qgnL0AbMPAEpG5jhlnbN30zKj6-TT42mTyTdHNJICuIG0R7odYO8" />
                                </div>

                                {/* Duplicate Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[480px] bg-white/5 backdrop-blur-xl border border-white/10 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/40 italic">Organiza tus proyectos</span>
                                        <div className="flex -space-x-2">
                                            <div className="size-6 rounded-full bg-[#cdb8e1] border-2 border-black"></div>
                                            <div className="size-6 rounded-full bg-blue-400 border-2 border-black"></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-2">
                                            <div className="text-[9px] uppercase font-bold text-white/30">Ready</div>
                                            <div className="h-24 bg-white/5 rounded-2xl border border-white/10 p-2">
                                                <div className="h-full w-full bg-white/5 rounded-lg"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[9px] uppercase font-bold text-[#cdb8e1]">Retouching</div>
                                            <div className="h-24 bg-[#cdb8e1]/10 rounded-2xl border border-[#cdb8e1]/20 p-2">
                                                <div className="h-full w-full bg-[#cdb8e1]/10 rounded-lg"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[9px] uppercase font-bold text-white/30">Delivered</div>
                                            <div className="h-24 bg-white/5 rounded-2xl border border-white/10 p-2"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Event" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC41p8R7-woErTUg9JzHCERhIvnIPxxJ5qyN4k3rZLvErQkXtekziJ0vSLJkMvLg_EdoAYj4ROOGiOMiOgT-Yrxmd_Qv5tW3pfIV9wa31ggsaMSRURWDRCaNnbwAIpbBI5b2pCYRiZ_-QbFe0Mrr0Mdv9v8VHoLsSk8cur3z3zsVP4OYFUpljx6duMRsUNJgbjmrMLksVXJSUY2xz25B7sFUFjblQRXrxnclw2r8c65NrxGgL3wtvJ23SM8RIyekoiTinBlog3VFeg" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[380px] bg-white/5 backdrop-blur-xl border border-white/10 p-0 flex flex-col">
                                    <div className="flex-1 flex items-center justify-center relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                                        <div className="z-10 text-center">
                                            <div className="size-20 bg-[#cdb8e1] rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl shadow-[#cdb8e1]/20">
                                                <span className="material-symbols-outlined text-black text-4xl">music_note</span>
                                            </div>
                                            <p className="font-bold text-xl mb-1">Música y Tipografía</p>
                                            <p className="text-[10px] text-white/40 tracking-[0.4em] uppercase">Personalización Total</p>
                                        </div>
                                    </div>
                                    <div className="h-1 bg-white/10 w-full"><div className="h-full w-1/3 bg-[#cdb8e1]"></div></div>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Portrait Photography" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhIOTWnXZB4Yo4E2uRwFLYQgWFCBVlPbsNQuRwXD9CSsaiErKRNztcvhl4IltGg99l7nQBN8g1AeMWpH_eYiPxB9KQ4m6EHYSE31PrlI7KFktTnZOMZrYB27JKP-krOygGqQeEA2mBnQp8U61kWYQ9ySlNVvvCS4OBrNTKWOs-h9k93mkQMgiGtIiqwPMms9Ovn8w-PcEWQTqMbdK8uk1Dtd-qgnL0AbMPAEpG5jhlnbN30zKj6-TT42mTyTdHNJICuIG0R7odYO8" />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Right Scroll */}
                        <div className="relative overflow-hidden group">
                            <div className="flex gap-4 w-fit py-2 animate-scroll-right hover:[animation-play-state:paused]">
                                {/* Original Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-white/5 backdrop-blur-xl border border-white/10">
                                    <span className="material-symbols-outlined text-[#cdb8e1] text-5xl mb-6">smart_display</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Video Integrado</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">Tus fotos y videos de la nube conviven con YouTube y Vimeo en un mismo sitio.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Photographer work" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDEvIB6g-xfLvj5yUIKJDCgGOmKyt28b4eXmy3Pe_Wfre8UzTJZKX8XBN8fg5hkdPdNbq8Tt9Ujv8Wsfg5XSkNQES0fstubgOWoeb2oYB_QYhdVCvx5HSFM_BZU30Qxk76Frw-fruXkjpV-ZCoCizDpLo2okjts2Jcb3wrw3sIwkL9jBSbz0nnJYXCXfYfAZ4FgFowg0P1UadRe79ePdo_K08PGOgchjG_QdJ2Qvlbvo4AYJEa3irk7ldRDh0IdkvgbrknPWkQJqA" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-white/5 backdrop-blur-xl border border-white/10">
                                    <span className="material-symbols-outlined text-white text-5xl mb-6">groups</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Galerías Colaborativas</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">Crea eventos participativos donde todos contribuyen al álbum vía QR.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Workflow session" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDEvIB6g-xfLvj5yUIKJDCgGOmKyt28b4eXmy3Pe_Wfre8UzTJZKX8XBN8fg5hkdPdNbq8Tt9Ujv8Wsfg5XSkNQES0fstubgOWoeb2oYB_QYhdVCvx5HSFM_BZU30Qxk76Frw-fruXkjpV-ZCoCizDpLo2okjts2Jcb3wrw3sIwkL9jBSbz0nnJYXCXfYfAZ4FgFowg0P1UadRe79ePdo_K08PGOgchjG_QdJ2Qvlbvo4AYJEa3irk7ldRDh0IdkvgbrknPWkQJqA" />
                                </div>

                                {/* Duplicate Set */}
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-white/5 backdrop-blur-xl border border-white/10">
                                    <span className="material-symbols-outlined text-[#cdb8e1] text-5xl mb-6">smart_display</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Video Integrado</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">Tus fotos y videos de la nube conviven con YouTube y Vimeo en un mismo sitio.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Photographer work" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDEvIB6g-xfLvj5yUIKJDCgGOmKyt28b4eXmy3Pe_Wfre8UzTJZKX8XBN8fg5hkdPdNbq8Tt9Ujv8Wsfg5XSkNQES0fstubgOWoeb2oYB_QYhdVCvx5HSFM_BZU30Qxk76Frw-fruXkjpV-ZCoCizDpLo2okjts2Jcb3wrw3sIwkL9jBSbz0nnJYXCXfYfAZ4FgFowg0P1UadRe79ePdo_K08PGOgchjG_QdJ2Qvlbvo4AYJEa3irk7ldRDh0IdkvgbrknPWkQJqA" />
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[350px] p-10 flex flex-col justify-end bg-white/5 backdrop-blur-xl border border-white/10">
                                    <span className="material-symbols-outlined text-white text-5xl mb-6">groups</span>
                                    <h3 className="text-3xl font-bold mb-3 tracking-tight">Galerías Colaborativas</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">Crea eventos participativos donde todos contribuyen al álbum vía QR.</p>
                                </div>
                                <div className="h-[280px] rounded-[2.5rem] overflow-hidden flex-shrink-0 relative transition-all duration-500 w-[85vw] sm:w-[420px]">
                                    <img alt="Workflow session" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDEvIB6g-xfLvj5yUIKJDCgGOmKyt28b4eXmy3Pe_Wfre8UzTJZKX8XBN8fg5hkdPdNbq8Tt9Ujv8Wsfg5XSkNQES0fstubgOWoeb2oYB_QYhdVCvx5HSFM_BZU30Qxk76Frw-fruXkjpV-ZCoCizDpLo2okjts2Jcb3wrw3sIwkL9jBSbz0nnJYXCXfYfAZ4FgFowg0P1UadRe79ePdo_K08PGOgchjG_QdJ2Qvlbvo4AYJEa3irk7ldRDh0IdkvgbrknPWkQJqA" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Studio Section */}
                <section className="relative py-20 md:py-32 flex items-center overflow-hidden bg-black" id="studio">
                    <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 aspect-video rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative border-white/20 group">
                                <img alt="Studio Experience" className="w-full h-full object-cover opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4jyKiTJRi1xH4_X6VdTyoj0odZaeaIXSfPgtN1SvQwq8zVsc6EhOP52ldQBkGmy0xVU-3tUNOIxz1fStfGM2GDGe5s-ZlXJHmyS9b8XSoQaR2aiUf4F5CrK9Ba0NE7J6iaaI2STcqPPoKRfK_JBqxyHeqwyKWOhxWU2qIdVz-OAD7dmC37vx-S4zcnCSbc230B0O5vxnEeS8piJANNxQz5C1KV7E4TFjWJUjfjRfYSbZHjMwlw4UrFN-DHXe21cXNA_5XGpZVWbs" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                <div className="absolute top-8 left-8 flex gap-3 items-center bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                                    <span className="size-2 rounded-full bg-red-500 animate-pulse"></span>
                                    <span className="text-[10px] font-bold tracking-widest uppercase">Video 4K Live</span>
                                </div>
                                <div className="absolute bottom-8 left-8 right-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="size-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                                                <span className="material-symbols-outlined text-white">music_note</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg italic">Celestial Horizon</p>
                                                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Envato Music Collection</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="material-symbols-outlined text-white/60">skip_previous</span>
                                            <span className="material-symbols-outlined text-white">pause</span>
                                            <span className="material-symbols-outlined text-white/60">skip_next</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full w-2/5 bg-[#cdb8e1]"></div>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="size-24 bg-[#cdb8e1] text-black rounded-full flex items-center justify-center shadow-3xl">
                                        <span className="material-symbols-outlined text-5xl">play_arrow</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-12 -right-12 w-64 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl hidden xl:block shadow-2xl border-white/20">
                                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                    <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Music Library</span>
                                    <span className="material-symbols-outlined text-xs">close</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-2 bg-[#cdb8e1]/20 rounded-xl border border-[#cdb8e1]/20">
                                        <div className="size-8 bg-[#cdb8e1] rounded-lg flex items-center justify-center text-black">
                                            <span className="material-symbols-outlined text-sm">equalizer</span>
                                        </div>
                                        <span className="text-xs font-bold">Dreamy Loft</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
                                        <div className="size-8 bg-white/10 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                                        </div>
                                        <span className="text-xs text-white/60">Urban Echo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 max-w-xl">
                            <span className="text-[#cdb8e1] font-black text-[10px] tracking-[0.4em] uppercase mb-6 block italic">Flujo Creativo</span>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-[1.1] tracking-tighter text-white">Inmersión profesional <br />para tu flujo creativo.</h2>
                            <p className="text-lg text-white/50 mb-8 font-light leading-relaxed">
                                Eleva tu forma de trabajar y de entregar tu contenido.
                            </p>
                            <p className="text-lg text-white/50 mb-0 font-light leading-relaxed">
                                CloserLens conecta tus proyectos, tu agenda y tus galerías en un solo lugar, pensado para <span className="text-white font-medium">fotógrafos, actores, modelos, músicos, familias, studios y agencias</span> que buscan orden, claridad y una presentación que realmente se siente premium.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Smart Folders Section */}
                <section className="py-20 md:py-32 bg-[#080808]">
                    <div className="max-w-[1400px] mx-auto px-6 lg:px-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-32 items-center">
                            <div>
                                <h2 className="text-4xl md:text-7xl font-bold mb-10 tracking-tighter leading-tight">Smart Folders:<br /><span className="text-[#cdb8e1] italic">Mirror Sync.</span></h2>
                                <p className="text-xl text-white/50 mb-12 font-light leading-relaxed">Olvídate de organizar dos veces. La estructura que creas en Google Drive se convierte automáticamente en el menú de tu galería CloserLens.</p>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl border-[#cdb8e1]/20 flex items-center gap-6">
                                        <div className="size-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                                            <span className="material-symbols-outlined text-4xl">drive_file_move</span>
                                        </div>
                                        <p className="text-sm text-white/60">Arrastra fotos a subcarpetas en tu Mac o PC y listo.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="flex flex-col gap-8">
                                    <div className="hidden md:block bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl border-white/5 opacity-60 scale-95 translate-x-[-10%] origin-right">
                                        <div className="flex items-center gap-4 mb-4 text-xs font-bold text-white/30 tracking-widest uppercase italic">
                                            <img alt="Drive" className="size-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdRFGduAjb227kdKrpEwHu_4M_DOQLYT52r1bVY3hnWKLhqgwNfzq-TTzVlc7hAZjqYCrI-uYYWyoYG3I5hte6a8jcL9EFOZ_Ax4b-rRpwGw6U_lTqydZ9CoHQV8-VUnhAKmYQcEKvDlSDN36fQDR2eUMaPgB-tsmFqILaKhhaKF3awdWQzTW2MHiEeXIPhRmXxGkJ3WTnLgRYoFO2rq_J0slHqyyKktnVNZ7xe4Knasf3zocxnN160f2sBvDbdYYo0TsN626my54" />
                                            Google Drive Source
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 py-2 px-3 bg-white/5 rounded-lg">
                                                <span className="material-symbols-outlined text-blue-400">folder</span>
                                                <span className="text-sm">Sofía y Fernando</span>
                                            </div>
                                            <div className="ml-8 space-y-2">
                                                <div className="flex items-center gap-3 py-2 px-3 bg-white/10 rounded-lg">
                                                    <span className="material-symbols-outlined text-yellow-400">folder</span>
                                                    <span className="text-sm">01. Ceremonia</span>
                                                </div>
                                                <div className="flex items-center gap-3 py-2 px-3 bg-white/5 rounded-lg opacity-50">
                                                    <span className="material-symbols-outlined text-yellow-400">folder</span>
                                                    <span className="text-sm">02. Sesión Pareja</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 z-20">
                                        <div className="size-16 bg-[#cdb8e1] rounded-full flex items-center justify-center shadow-2xl border-4 border-[#0a0a0a]">
                                            <span className="material-symbols-outlined text-black font-black">arrow_forward</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl border-[#cdb8e1]/40">
                                        <div className="flex items-center gap-4 mb-8 text-xs font-bold text-[#cdb8e1] tracking-widest uppercase">
                                            CloserLens Premium Gallery
                                        </div>
                                        <div className="flex flex-wrap gap-4 mb-10">
                                            <div className="px-6 py-2 bg-[#cdb8e1] text-black rounded-full text-xs font-bold">TODO</div>
                                            <div className="px-6 py-2 border border-white/10 rounded-full text-xs font-bold hover:border-[#cdb8e1] transition-all">CEREMONIA</div>
                                            <div className="px-6 py-2 border border-white/10 rounded-full text-xs font-bold">SESIÓN PAREJA</div>
                                            <div className="px-6 py-2 border border-white/10 rounded-full text-xs font-bold">FIESTA</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="aspect-square bg-white/5 rounded-xl"></div>
                                            <div className="aspect-square bg-white/5 rounded-xl"></div>
                                            <div className="aspect-square bg-white/10 rounded-xl relative overflow-hidden">
                                                <div className="absolute inset-0 bg-[#cdb8e1]/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[#cdb8e1] text-xl">favorite</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Family Portal Section */}
                <section className="py-16 md:py-24 bg-white text-black">
                    <div className="max-w-[1400px] mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
                        <div className="relative">
                            <div className="bg-gray-100 rounded-[3rem] p-12 aspect-[4/3] relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#cdb8e1]"></div>
                                <div className="flex items-center gap-4 mb-12">
                                    <div className="size-12 rounded-full bg-[#cdb8e1] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white">family_history</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl">Recuerdos en Familia</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Client Portal</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
                                    <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
                                </div>
                                <div className="mt-8 flex justify-center">
                                    <button className="bg-black text-white px-8 py-3 rounded-full text-sm font-bold">Descargar Todo</button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className="text-[#cdb8e1] font-black text-[10px] tracking-[0.4em] uppercase mb-6 block">Coming Soon</span>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tighter">CloserLens for Family</h2>
                            <p className="text-xl text-gray-500 mb-10 font-light leading-relaxed">
                                Una interfaz simplificada y cálida diseñada específicamente para entregas familiares. Botones grandes, acceso sin contraseña por correo y optimización para tíos y abuelos.
                            </p>
                            <ul className="space-y-4 text-gray-600">
                                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#cdb8e1]">check_circle</span> Compartir por WhatsApp directo</li>
                                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#cdb8e1]">check_circle</span> Interfaz "Clean White" sin distracciones</li>
                                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-[#cdb8e1]">check_circle</span> Compresión inteligente para móviles</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <PricingSection plans={plans} />

                {/* Footer */}
                <footer className="py-16 md:py-24 px-6 lg:px-20 border-t border-white/5 bg-black">
                    <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-20">
                        <div className="col-span-1 md:col-span-2">
                            <div className="w-56 mb-8 relative">
                                <img src="/logo-white.svg" alt="CloserLens" className="w-full h-auto object-contain" />
                            </div>
                            <p className="text-white/40 max-w-sm font-light leading-relaxed">Redefiniendo el estándar de entrega fotográfica. Tu infraestructura de Drive, nuestra cara de lujo.</p>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-10">Producto</h4>
                            <ul className="space-y-4 text-sm font-medium">
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Agenda</a></li>
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Scena</a></li>
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Galerías Closer</a></li>
                                <li><a className="hover:text-[#cdb8e1] transition-colors" href="#">Galerías Colaborativas</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-10">Legal</h4>
                            <ul className="space-y-4 text-sm font-medium text-white/40">
                                <li><a className="hover:text-white transition-colors" href="#">Términos</a></li>
                                <li><a className="hover:text-white transition-colors" href="#">Privacidad</a></li>
                                <li><a className="hover:text-white transition-colors" href="#">Security</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="max-w-[1400px] mx-auto mt-24 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <span className="text-[10px] text-white/20 tracking-widest uppercase font-bold">© 2024 CloserLens SaaS. Premium Creative Workflows.</span>
                        <div className="flex gap-8 text-[10px] font-black tracking-widest uppercase">
                            <a className="hover:text-[#cdb8e1] transition-colors" href="#">Instagram</a>
                            <a className="hover:text-[#cdb8e1] transition-colors" href="#">Twitter</a>
                        </div>
                    </div>
                </footer>

                {/* Sticky Bottom Bar */}
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur-xl border border-white/10 px-10 py-5 rounded-full flex items-center gap-10 shadow-2xl border-white/20">
                    <span className="text-xs font-bold text-white/90 hidden lg:block tracking-widest uppercase">Eleva tu flujo de trabajo.</span>
                    <div className="flex gap-4">
                        <button className="bg-white text-black px-8 py-2 rounded-full text-xs font-black tracking-widest uppercase hover:bg-[#cdb8e1] transition-all">Prueba Gratis</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
