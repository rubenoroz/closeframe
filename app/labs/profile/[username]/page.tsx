import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TemplateViewer } from "@/components/profile-v2/TemplateViewer";
import { TemplateContent, defaultTemplateContent } from "@/types/profile-v2";
import { getInitialProfileData } from "@/lib/profile-v2/templates";
import { Metadata } from 'next';
import { getEffectivePlanConfig } from "@/lib/plans.config";

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
            profileV2: true,
            plan: {
                select: {
                    name: true,
                    config: true
                }
            }
        } as any
    }) as any;

    if (!user) {
        return notFound();
    }

    // Check Features: Public Profile
    const effectiveConfig = getEffectivePlanConfig(user.plan?.config || user.plan?.name, user.featureOverrides);
    const isPublicProfileEnabled = effectiveConfig.features?.publicProfile !== false;

    if (!isPublicProfileEnabled) {
        return notFound();
    }

    let content: TemplateContent;
    if (user.profileV2?.content) {
        content = user.profileV2.content as unknown as TemplateContent;
    } else {
        // Fallback: use the refined tutorial template logic
        content = getInitialProfileData(user);
    }

    return <TemplateViewer data={content} userId={user.id} />;
}
