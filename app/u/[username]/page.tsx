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
            id: true
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

    // Redirect to the actual profile page
    redirect(`/p/${user.id}`);
}
