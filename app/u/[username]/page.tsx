import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

interface Props {
    params: Promise<{
        username: string;
    }>;
}

export const dynamic = "force-dynamic";

export default async function VanityURLPage({ params }: Props) {
    const { username } = await params;

    // Find user by username
    const user = await prisma.user.findFirst({
        where: {
            username: {
                equals: username,
                mode: 'insensitive' // Case-insensitive search
            }
        },
        select: {
            id: true,
            username: true,
            featureOverrides: true
        }
    });

    if (!user) {
        return notFound();
    }

    // Increment profile views
    await prisma.user.update({
        where: { id: user.id },
        data: { profileViews: { increment: 1 } }
    });

    // Check if profile v2 is enabled for this user or by ENV
    const isV2Enabled = process.env.NEXT_PUBLIC_PROFILE_V2_ALL === 'true' ||
        (user.featureOverrides as any)?.profileVersion === 'v2';

    if (isV2Enabled) {
        redirect(`/labs/profile/${user.username}`);
    }

    // Redirect to the actual profile page (v1)
    redirect(`/p/${user.id}`);
}
