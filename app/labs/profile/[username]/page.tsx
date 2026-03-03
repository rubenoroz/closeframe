import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TemplateViewer } from "@/components/profile-v2/TemplateViewer";
import { TemplateContent } from "@/types/profile-v2";
import { Metadata } from 'next';

interface Props {
    params: Promise<{
        username: string;
    }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;

    // Fetch user for name/business name
    const user = await prisma.user.findFirst({
        where: {
            username: {
                equals: username,
                mode: 'insensitive'
            }
        },
        select: {
            name: true,
            businessName: true,
            profileV2: {
                select: {
                    content: true
                }
            }
        }
    });

    if (!user) {
        return { title: 'User Not Found | Closerlens' };
    }

    const titlePrefix = user.businessName || username || user.name || "Closerlens";

    // Attempt logic to extract description from Bio/Hero
    let profileDesc = "Closerlens Public Profile";
    const content = user.profileV2?.content as unknown as TemplateContent;
    if (content?.hero?.description) {
        profileDesc = content.hero.description.substring(0, 160);
    }

    return {
        title: `Closerlens - ${titlePrefix}`,
        description: profileDesc,
    };
}

export default async function LabsProfilePage({ params }: Props) {
    const { username } = await params;

    const user = await prisma.user.findFirst({
        where: {
            username: {
                equals: username,
                mode: 'insensitive'
            }
        },
        include: {
            profileV2: true
        } as any
    }) as any;

    if (!user) {
        return notFound();
    }

    let content: TemplateContent;
    if (user.profileV2?.content) {
        content = user.profileV2.content as unknown as TemplateContent;
    } else {
        // Fallback: default content based on user info
        content = {
            header: {
                logoText: user.businessName || user.username || user.name || "Closerlens",
                navigation: [
                    { label: "Home", url: "#home" },
                    { label: "About", url: "#about" },
                    { label: "Experience", url: "#experience" },
                    { label: "Projects", url: "#projects" }
                ],
                socials: []
            },
            hero: {
                heading: `Hola, soy ${user.name}`,
                description: user.bio || "Bienvenido a mi nuevo perfil.",
                buttonText: "Contáctame",
                image: user.coverImage || undefined,
                visible: true
            },
            about: {
                title: "Sobre mí",
                description: user.bio || "",
                yearsOfExperience: 0,
                skills: [],
                visible: true
            },
            services: [],
            experience: [],
            experienceTitle: "Experiencia",
            projects: [],
            projectsTitle: "Galerías",
            projectsViewAllText: "Ver todas",
            testimonials: [],
            testimonialsTitle: "Testimonios",
            footer: {
                email: user.email,
                socialLabel: "Sígueme",
                copyrightText: `© ${new Date().getFullYear()} ${user.name}`
            },
            colors: {
                primary: "#23a592",
                bgDark: "#1d1d1d",
                bgLight: "#f5f5f5",
                bgWhite: "#ffffff",
                textDark: "#343434",
                textGray: "#767676",
                textWhite: "#ffffff",
                headerBorder: "#343434"
            }
        };
    }

    return <TemplateViewer data={content} userId={user.id} />;
}
