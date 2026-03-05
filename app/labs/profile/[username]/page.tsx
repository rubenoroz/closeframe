import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TemplateViewer } from "@/components/profile-v2/TemplateViewer";
import { TemplateContent, defaultTemplateContent } from "@/types/profile-v2";
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

    const content = user.profileV2?.content as unknown as TemplateContent;
    const titlePrefix = content?.businessName || user.businessName || username || user.name || "Closerlens";

    // Attempt logic to extract description from Bio/Hero
    let profileDesc = "Closerlens Public Profile";
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
        // Fallback: use global defaultTemplateContent and inject user-specific info
        content = {
            ...defaultTemplateContent,
            header: {
                ...defaultTemplateContent.header,
                logoText: user.businessName || user.username || user.name || defaultTemplateContent.header.logoText,
            },
            hero: {
                ...defaultTemplateContent.hero,
                heading: user.name ? `Hola, soy ${user.name}` : defaultTemplateContent.hero.heading,
                description: user.bio || defaultTemplateContent.hero.description,
            },
            about: {
                ...defaultTemplateContent.about,
                description: user.bio || defaultTemplateContent.about.description,
            },
            footer: {
                ...defaultTemplateContent.footer,
                email: user.email || defaultTemplateContent.footer.email,
                copyrightText: `© ${new Date().getFullYear()} ${user.businessName || user.name || "Tu Marca"}`
            }
        };
    }

    return <TemplateViewer data={content} userId={user.id} />;
}
