import React from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Instagram, Globe, Mail, Camera, Linkedin, Youtube, Video, ExternalLink } from "lucide-react";
import GalleryPreviewCard from "@/components/gallery/GalleryPreviewCard";
import ProfileCTA from "@/components/profile/ProfileCTA";
import { getEffectivePlanConfig } from "@/lib/plans.config";

interface Props {
    params: Promise<{
        id: string;
    }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
            coverImage: true,
            coverImageFocus: true,
            pronouns: true,
            callToAction: true,
            bookingWindow: true,
            bookingLeadTime: true,
            profileViews: true,
            plan: {
                select: {
                    name: true,
                    config: true,
                    limits: true
                }
            },
            featureOverrides: true,
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
                orderBy: [
                    { profileOrder: 'asc' },
                    { createdAt: 'desc' }
                ]
            }
        }
    });

    if (!user) {
        return notFound();
    }

    // 1. Calculate Effective Config
    const effectiveConfig = getEffectivePlanConfig(user.plan?.config || user.plan?.name, user.featureOverrides);

    // 2. Enforce Master Switch: Public Profile
    // If publicProfile is explicitly FALSE, we show 404.
    // Default to true if undefined to assume access unless restricted.
    const isPublicProfileEnabled = effectiveConfig.features?.publicProfile !== false;

    if (!isPublicProfileEnabled) {
        return notFound();
    }

    // 3. Determine Pro Features Visibility
    const isProfessionalProfile = effectiveConfig.features?.professionalProfile || false;
    const isCoverImageAllowed = effectiveConfig.features?.coverImage ?? isProfessionalProfile;
    const isCTAAllowed = effectiveConfig.features?.callToAction ?? isProfessionalProfile;
    const isCustomFieldsAllowed = effectiveConfig.features?.customFields ?? isProfessionalProfile;

    const brandingName = user.businessName || user.name || "CloserLens Studio";
    const publicProjects = user.projects || [];
    const isLight = user.theme !== 'dark'; // Default to light (beige) theme

    // Parse limits (legacy cleanup, mainly for branding check fallback)
    let planLimits: any = {};
    if (user.plan?.limits) {
        try {
            planLimits = typeof user.plan.limits === 'string' ? JSON.parse(user.plan.limits) : user.plan.limits;
        } catch (e) {
            // ignore
        }
    }
    // Logic: Hide branding if plan says so, OR if using pro features is disabled? 
    // Actually keep separate: hideBranding is usually a "Removal of Platform Branding". 
    // Here we are talking about User's Branding (Logo).
    const showBranding = !planLimits.hideBranding;
    const { callToAction } = user as any;



    return (
        <main className={`min-h-screen transition-colors duration-500 ${isLight ? 'bg-[#f6f5f2] text-neutral-900' : 'bg-neutral-950 text-white'}`}>

            {/* COVER IMAGE (PRO) */}
            {user.coverImage && isCoverImageAllowed && (
                <div className="w-full h-48 md:h-80 lg:h-96 relative overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img
                            src={user.coverImage}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            style={{
                                transform: (() => {
                                    const parts = (user.coverImageFocus || "50,50,1").split(",").map(Number);
                                    const s = parts[2] || 1;
                                    return `scale(${s})`;
                                })(),
                                objectPosition: (() => {
                                    const parts = (user.coverImageFocus || "50,50,1").split(",").map(Number);
                                    const x = parts[0] || 50;
                                    const y = parts[1] || 50;
                                    return `${x}% ${y}%`;
                                })()
                            }}
                        />
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? 'from-[#f6f5f2]' : 'from-neutral-950'} to-transparent opacity-60`} />
                </div>
            )}

            {/* HERO */}
            <section className={`max-w-5xl mx-auto px-6 ${user.coverImage && isCoverImageAllowed ? '-mt-20 md:-mt-28 relative z-10' : 'pt-20 md:pt-28'} pb-16 md:pb-20 text-center`}>
                {/* Logo/Avatar */}
                <div className={`mx-auto mb-6 md:mb-8 w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center overflow-hidden shadow-2xl ${isLight ? 'bg-neutral-300 ring-4 ring-[#f6f5f2]' : 'bg-neutral-800 ring-4 ring-neutral-950'}`}>
                    {user.businessLogo && isProfessionalProfile ? (
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

                {/* Name & Pronouns */}
                <div className="flex items-center justify-center gap-2 mb-2">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-light">{brandingName}</h1>

                </div>

                {/* Headline (PRO) */}
                {user.headline && isCustomFieldsAllowed && (
                    <p className={`text-sm md:text-base font-light mb-2 max-w-2xl mx-auto ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                        {user.headline}
                    </p>
                )}

                {/* Location (PRO) */}
                {user.location && isCustomFieldsAllowed && (
                    <p className={`text-xs md:text-sm mb-4 ${isLight ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        📍 {user.location}
                    </p>
                )}

                {/* Tagline/Specialty (Allowed in Free?) Let's keep it visible as it's basic info, or hide if strict "Simple" mode. User said "simple: avatar, name, bio". So hide specialty too. */}
                {user.specialty && isCustomFieldsAllowed && (
                    <p className={`text-xs md:text-sm uppercase tracking-widest mb-4 md:mb-6 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {user.specialty}
                    </p>
                )}

                {user.bio && (
                    <p className={`max-w-xl mx-auto leading-relaxed text-sm md:text-base mb-8 text-justify ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {user.bio}
                    </p>
                )}

                {/* CTA Button (PRO) */}
                {callToAction?.label && isCTAAllowed && (
                    <div className="mb-10">
                        <ProfileCTA
                            callToAction={callToAction}
                            userId={user.id}
                            isLight={isLight}
                            bookingWindow={user.bookingWindow ?? 4}
                            bookingLeadTime={user.bookingLeadTime ?? 1} // Default 1 day buffer
                        />
                    </div>
                )}

                {/* Social Links - Dynamic */}
                {/* Social Links - Dynamic with Plan Enforcement */}
                {(() => {
                    // 1. Determine Limits
                    const maxSocialLinks = effectiveConfig.limits?.maxSocialLinks ?? 1;
                    const advancedSocialAllowed = effectiveConfig.features?.advancedSocialNetworks ?? false;

                    // 2. Collect All Potential Links
                    const links = [];

                    // Instagram (Always allowed as 'Basic' social, usually)
                    // If strict "Advanced Social Networks" means NO social networks except Instagram?
                    // Yes, based on SettingsPage logic: only Instagram if !advancedSocialAllowed.
                    let hasInstagram = false;
                    if (user.businessInstagram) {
                        links.push({
                            id: 'instagram',
                            icon: Instagram,
                            url: `https://instagram.com/${user.businessInstagram.replace('@', '')}`,
                            label: 'Instagram'
                        });
                        hasInstagram = true;
                    } else if ((user.socialLinks as any)?.instagram) {
                        links.push({
                            id: 'instagram',
                            icon: Instagram,
                            url: `https://instagram.com/${((user.socialLinks as any).instagram as string).replace('@', '')}`,
                            label: 'Instagram'
                        });
                        hasInstagram = true;
                    }

                    // Other Networks (Only if Advanced allowed)
                    if (advancedSocialAllowed) {
                        const sl = (user.socialLinks as any) || {};

                        if (sl.linkedin) links.push({ id: 'linkedin', icon: Linkedin, url: sl.linkedin.startsWith('http') ? sl.linkedin : `https://${sl.linkedin}`, label: 'LinkedIn' });
                        if (sl.youtube) links.push({ id: 'youtube', icon: Youtube, url: sl.youtube.startsWith('http') ? sl.youtube : `https://${sl.youtube}`, label: 'YouTube' });
                        if (sl.vimeo) links.push({ id: 'vimeo', icon: Video, url: sl.vimeo.startsWith('http') ? sl.vimeo : `https://${sl.vimeo}`, label: 'Vimeo' });

                        // Facebook & Twitter (X) - Add support as they are in SettingsPage
                        if (sl.facebook) links.push({ id: 'facebook', icon: Globe, url: sl.facebook.startsWith('http') ? sl.facebook : `https://${sl.facebook}`, label: 'Facebook' }); // Using Globe as generic if icon imported? importing below
                        // Note: I need to ensure I have icons imported or fallback. 
                        // The existing file imports: Instagram, Globe, Mail, Camera, Linkedin, Youtube, Video, ExternalLink
                        // It does NOT import Facebook, Twitter. I should check imports or use Globe.

                        if (sl.twitter) links.push({ id: 'twitter', icon: Globe, url: sl.twitter.startsWith('http') ? sl.twitter : `https://${sl.twitter}`, label: 'X / Twitter' });

                        // Website
                        if (sl.website) {
                            links.push({ id: 'website', icon: Globe, url: sl.website.startsWith('http') ? sl.website : `https://${sl.website}`, label: 'Sitio web' });
                        } else if (user.businessWebsite) {
                            links.push({ id: 'website', icon: Globe, url: user.businessWebsite, label: 'Sitio web' });
                        }
                    }

                    // 3. Apply Limit
                    const visibleLinks = maxSocialLinks === -1 ? links : links.slice(0, maxSocialLinks);

                    return (
                        <div className={`flex justify-center flex-wrap gap-5 md:gap-6 mt-8 md:mt-10 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                            {visibleLinks.map((link, idx) => (
                                <a
                                    key={`${link.id}-${idx}`}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                                    title={link.label}
                                >
                                    <link.icon className="w-5 h-5" />
                                </a>
                            ))}

                            {/* Email - Always visible as contact info */}
                            <a
                                href={`mailto:${user.email}`}
                                className={`transition-colors ${isLight ? 'hover:text-black' : 'hover:text-white'}`}
                                title="Email"
                            >
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    );
                })()}
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
            {showBranding && (
                <footer className={`text-center text-xs pb-8 md:pb-10 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    © {new Date().getFullYear()} {brandingName} · Powered by Closerlens
                </footer>
            )}
            {!showBranding && (
                <footer className={`text-center text-xs pb-8 md:pb-10 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    © {new Date().getFullYear()} {brandingName}
                </footer>
            )}
        </main>
    );
}
