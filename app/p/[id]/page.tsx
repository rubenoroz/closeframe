import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Globe, Mail, Camera, Linkedin, Youtube, Video } from "lucide-react";
import GalleryPreviewCard from "@/components/gallery/GalleryPreviewCard";

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
            specialty: true,
            theme: true,
            businessLogoScale: true,
            // Perfil expandido
            profileType: true,
            headline: true,
            location: true,
            socialLinks: true,
            username: true,
            profileViews: true,
            projects: {
                where: {
                    showInProfile: true
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    coverImage: true,
                    createdAt: true,
                    cloudAccountId: true,
                    rootFolderId: true,
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
    const isLight = user.theme !== 'dark'; // Default to light (beige) theme

    return (
        <div className={`min-h-screen font-serif ${isLight ? 'bg-[#f6f5f2] text-[#1f1f1f]' : 'bg-neutral-950 text-neutral-100'}`}>
            {/* HERO */}
            <section className="max-w-5xl mx-auto px-6 pt-20 md:pt-28 pb-16 md:pb-20 text-center">
                {/* Logo/Avatar */}
                <div className={`mx-auto mb-6 md:mb-8 w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center overflow-hidden ${isLight ? 'bg-neutral-300' : 'bg-neutral-800'}`}>
                    {user.businessLogo ? (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ transform: `scale(${Number(user.businessLogoScale || 100) / 100})` }}
                        >
                            <img src={user.businessLogo} alt={brandingName} className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <Camera className={`w-8 h-8 ${isLight ? 'text-neutral-400' : 'text-neutral-600'}`} />
                    )}
                </div>

                {/* Name */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-light mb-2">{brandingName}</h1>

                {/* Headline */}
                {user.headline && (
                    <p className={`text-sm md:text-base font-light mb-2 ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                        {user.headline}
                    </p>
                )}

                {/* Location */}
                {user.location && (
                    <p className={`text-xs md:text-sm mb-4 ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        📍 {user.location}
                    </p>
                )}

                {/* Tagline/Specialty */}
                {user.specialty && (
                    <p className={`text-xs md:text-sm uppercase tracking-widest mb-4 md:mb-6 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {user.specialty}
                    </p>
                )}
                {user.bio && (
                    <p className={`max-w-xl mx-auto leading-relaxed text-sm md:text-base ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {user.bio}
                    </p>
                )}

                {/* Social Links - Dynamic */}
                <div className={`flex justify-center flex-wrap gap-5 md:gap-6 mt-8 md:mt-10 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                    {/* Legacy Instagram */}
                    {user.businessInstagram && (
                        <a
                            href={`https://instagram.com/${user.businessInstagram.replace('@', '')}`}
                            target="_blank"
                            className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                            title="Instagram"
                        >
                            <Instagram className="w-5 h-5" />
                        </a>
                    )}
                    {/* SocialLinks Instagram (si no hay legacy) */}
                    {!user.businessInstagram && (user.socialLinks as any)?.instagram && (
                        <a
                            href={`https://instagram.com/${((user.socialLinks as any).instagram as string).replace('@', '')}`}
                            target="_blank"
                            className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                            title="Instagram"
                        >
                            <Instagram className="w-5 h-5" />
                        </a>
                    )}
                    {/* LinkedIn */}
                    {(user.socialLinks as any)?.linkedin && (
                        <a
                            href={(user.socialLinks as any).linkedin.startsWith('http') ? (user.socialLinks as any).linkedin : `https://${(user.socialLinks as any).linkedin}`}
                            target="_blank"
                            className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                            title="LinkedIn"
                        >
                            <Linkedin className="w-5 h-5" />
                        </a>
                    )}
                    {/* YouTube */}
                    {(user.socialLinks as any)?.youtube && (
                        <a
                            href={(user.socialLinks as any).youtube.startsWith('http') ? (user.socialLinks as any).youtube : `https://${(user.socialLinks as any).youtube}`}
                            target="_blank"
                            className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                            title="YouTube"
                        >
                            <Youtube className="w-5 h-5" />
                        </a>
                    )}
                    {/* Vimeo */}
                    {(user.socialLinks as any)?.vimeo && (
                        <a
                            href={(user.socialLinks as any).vimeo.startsWith('http') ? (user.socialLinks as any).vimeo : `https://${(user.socialLinks as any).vimeo}`}
                            target="_blank"
                            className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                            title="Vimeo"
                        >
                            <Video className="w-5 h-5" />
                        </a>
                    )}
                    {/* Website from socialLinks */}
                    {(user.socialLinks as any)?.website && (
                        <a
                            href={(user.socialLinks as any).website.startsWith('http') ? (user.socialLinks as any).website : `https://${(user.socialLinks as any).website}`}
                            target="_blank"
                            className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                            title="Sitio web"
                        >
                            <Globe className="w-5 h-5" />
                        </a>
                    )}
                    {/* Legacy Website (si no hay socialLinks.website) */}
                    {!(user.socialLinks as any)?.website && user.businessWebsite && (
                        <a
                            href={user.businessWebsite}
                            target="_blank"
                            className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                            title="Sitio web"
                        >
                            <Globe className="w-5 h-5" />
                        </a>
                    )}
                    <a
                        href={`mailto:${user.email}`}
                        className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                        title="Email"
                    >
                        <Mail className="w-5 h-5" />
                    </a>
                </div>
            </section>

            {/* DIVIDER */}
            <div className="max-w-5xl mx-auto px-6">
                <div className={`h-px ${isLight ? 'bg-neutral-300' : 'bg-neutral-800'}`} />
            </div>

            {/* GALLERIES */}
            <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
                <h2 className="text-lg md:text-xl font-light mb-10 md:mb-12 text-center">Galerías destacadas</h2>

                {publicProjects.length === 0 ? (
                    <div className={`text-center py-16 rounded-xl border border-dashed ${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-700'}`}>
                        <Camera className={`w-10 h-10 mx-auto mb-4 ${isLight ? 'text-neutral-400' : 'text-neutral-600'}`} />
                        <p className={`text-sm ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>No hay galerías disponibles.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
                        {publicProjects.map((project: any) => (
                            <GalleryPreviewCard
                                key={project.id}
                                project={project}
                                isLight={isLight}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* FOOTER */}
            <footer className={`text-center text-xs pb-8 md:pb-10 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                © {new Date().getFullYear()} {brandingName} · Powered by Closeframe
            </footer>
        </div>
    );
}
