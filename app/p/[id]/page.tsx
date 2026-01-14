import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Globe, Mail, Camera, ExternalLink, ChevronRight } from "lucide-react";
import * as motion from "framer-motion/client";

interface Props {
    params: Promise<{
        id: string;
    }>;
}

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: Props) {
    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            businessName: true,
            businessLogo: true,
            businessWebsite: true,
            businessInstagram: true,
            businessPhone: true,
            bio: true,
            theme: true,
            businessLogoScale: true,
            projects: {
                where: {
                    public: true
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    coverImage: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });

    if (!user) {
        return notFound();
    }

    const brandingName = user.businessName || user.name || "Closeframe Studio";
    const publicProjects = user.projects || [];
    const isLight = user.theme === 'light';

    return (
        <div className={`min-h-screen font-sans transition-colors duration-1000 ${isLight ? 'bg-white text-neutral-900' : 'bg-neutral-950 text-neutral-100'}`}>
            {/* HERO / HEADER SECTION */}
            <section className="relative px-4 md:px-6 py-10 md:py-16 lg:py-20 text-center overflow-hidden">
                {!isLight && (
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-neutral-900" />
                )}
                {isLight && (
                    <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 to-white" />
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-3xl mx-auto"
                >
                    <div className={`mx-auto mb-4 md:mb-6 w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center p-2 md:p-3 shadow-2xl transition-all border ${isLight ? 'bg-white border-neutral-100 shadow-neutral-200' : 'bg-neutral-900 border-neutral-800 shadow-black'
                        }`}>
                        {user.businessLogo ? (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ transform: `scale(${Number(user.businessLogoScale || 100) / 100})` }}
                            >
                                <img src={user.businessLogo} alt={brandingName} className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <Camera className={`w-8 h-8 md:w-10 md:h-10 ${isLight ? 'text-neutral-200' : 'text-neutral-700'}`} />
                        )}
                    </div>

                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-light tracking-tight mb-3 md:mb-4">{brandingName}</h1>

                    {user.bio && (
                        <p className={`max-w-xl mx-auto mb-6 md:mb-8 text-sm md:text-base lg:text-lg font-light leading-relaxed ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            {user.bio}
                        </p>
                    )}

                    <div className="flex flex-wrap justify-center gap-2 md:gap-4 lg:gap-8">
                        {user.businessInstagram && (
                            <a
                                href={`https://instagram.com/${user.businessInstagram.replace('@', '')}`}
                                target="_blank"
                                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 rounded-full border transition-all duration-300 ${isLight ? 'border-neutral-200 text-neutral-500 hover:text-emerald-500 hover:border-emerald-500' : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500'
                                    }`}
                            >
                                <Instagram className="w-3 h-3 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-xs font-medium tracking-wide">{user.businessInstagram}</span>
                            </a>
                        )}
                        {user.businessWebsite && (
                            <a
                                href={user.businessWebsite}
                                target="_blank"
                                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 rounded-full border transition-all duration-300 ${isLight ? 'border-neutral-200 text-neutral-500 hover:text-emerald-500 hover:border-emerald-500' : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500'
                                    }`}
                            >
                                <Globe className="w-3 h-3 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-xs font-medium tracking-wide hidden sm:inline">{user.businessWebsite.replace(/^https?:\/\//, '')}</span>
                                <span className="text-[10px] md:text-xs font-medium tracking-wide sm:hidden">Web</span>
                            </a>
                        )}
                        <a
                            href={`mailto:${user.email}`}
                            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 rounded-full border transition-all duration-300 ${isLight ? 'border-neutral-200 text-neutral-500 hover:text-emerald-500 hover:border-emerald-500' : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500'
                                }`}
                        >
                            <Mail className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs font-medium tracking-wide hidden sm:inline">{user.email}</span>
                            <span className="text-[10px] md:text-xs font-medium tracking-wide sm:hidden">Email</span>
                        </a>
                    </div>
                </motion.div>
            </section>

            {/* GALLERIES SECTION */}
            <section id="galerias" className="px-4 md:px-6 py-8 md:py-12 lg:py-16 max-w-6xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-8 md:mb-16 px-1 md:px-2">
                    <h2 className="text-lg md:text-2xl lg:text-3xl font-light tracking-tight">Galerías</h2>
                    <div className={`h-px flex-1 ml-4 md:ml-8 opacity-10 ${isLight ? 'bg-neutral-900' : 'bg-white'}`} />
                </div>

                {publicProjects.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`rounded-2xl md:rounded-3xl p-10 md:p-20 border border-dashed text-center flex flex-col items-center gap-3 md:gap-4 ${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/20 border-neutral-800'
                            }`}
                    >
                        <Camera className="w-8 h-8 md:w-10 md:h-10 opacity-20" />
                        <p className="text-neutral-500 text-xs md:text-sm font-light">No hay galerías disponibles.</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-x-8 md:gap-y-12">
                        {publicProjects.map((project: any, index: number) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -5 }}
                                className="group"
                            >
                                <Link href={`/g/${project.slug}`} className="block">
                                    <div className={`aspect-video md:aspect-[3/2] rounded-2xl overflow-hidden mb-5 border transition-all duration-500 relative ${isLight ? 'bg-neutral-100 border-neutral-100 group-hover:shadow-xl group-hover:shadow-neutral-200/50 group-hover:border-emerald-500' : 'bg-neutral-900 border-neutral-800 group-hover:border-neutral-600 group-hover:shadow-black/50'
                                        }`}>
                                        {project.coverImage ? (
                                            <img
                                                src={project.coverImage}
                                                alt={project.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                                <Camera className={`w-10 h-10 transition-transform duration-500 group-hover:scale-110 ${isLight ? 'text-neutral-300' : 'text-neutral-700'}`} />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                                            <div className="text-white flex items-center gap-2 text-xs font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                Explorar <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h3 className={`text-lg font-medium mb-1 transition-colors ${isLight ? 'group-hover:text-emerald-600' : 'group-hover:text-emerald-400'}`}>
                                            {project.name}
                                        </h3>
                                        <p className={`text-[9px] uppercase tracking-[0.2em] font-black ${isLight ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                            Portafolio • {new Date(project.createdAt).getFullYear()}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* CONTACT CALL TO ACTION */}
            <section className={`px-4 md:px-6 py-16 md:py-28 lg:py-40 text-center transition-colors border-t border-b ${isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-neutral-900/40 border-white/5'
                }`}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-2xl mx-auto"
                >
                    <h2 className="text-xl md:text-3xl lg:text-5xl font-light mb-4 md:mb-8">¿Hacemos algo juntos?</h2>
                    <p className={`text-sm md:text-base lg:text-lg mb-8 md:mb-12 max-w-md mx-auto font-light ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        Si te interesa mi estilo, escríbeme.
                    </p>
                    <a
                        href={`mailto:${user.email}`}
                        className={`inline-block px-8 md:px-12 py-3 md:py-5 rounded-full text-sm md:text-base font-medium transition-all duration-300 transform hover:scale-105 shadow-xl ${isLight ? 'bg-neutral-900 text-white hover:bg-black shadow-neutral-200' : 'bg-white text-black hover:bg-neutral-100'
                            }`}
                    >
                        Enviar correo
                    </a>
                </motion.div>
            </section>

            {/* FOOTER */}
            <footer className={`px-6 py-12 text-center text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <Link href="/" className="hover:opacity-100 transition-opacity">
                    © {new Date().getFullYear()} Closeframe Studio • Powered by Antigravity
                </Link>
            </footer>
        </div>
    );
}
