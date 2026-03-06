import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import GuestUploadClient from './GuestUploadClient';
import MassiveUploadClient from './MassiveUploadClient';
import { getFeatureAccess } from '@/lib/features/service';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ token: string }>;
}

export default async function GuestUploadPage({ params }: Props) {
    const { token } = await params;

    // Verify the QR section exists and is active
    const section = await prisma.qrSection.findUnique({
        where: { slug: token },
        include: {
            gallery: {
                include: {
                    project: true
                }
            }
        }
    });

    if (!section) {
        notFound();
    }

    if (!section.isActive || !section.gallery.isActive) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-white mb-2">Upload Closed</h1>
                    <p className="text-slate-400 text-sm">
                        This gallery is no longer accepting uploads.
                    </p>
                </div>
            </div>
        );
    }

    // Check if owner has massive upload enabled
    const ownerId = section.gallery.project.userId;
    const { allowed: massiveUploadEnabled } = await getFeatureAccess(ownerId, 'massiveUpload');

    if (massiveUploadEnabled) {
        return <MassiveUploadClient token={token} />;
    }

    return <GuestUploadClient token={token} />;
}

export async function generateMetadata({ params }: Props) {
    const { token } = await params;

    const section = await prisma.qrSection.findUnique({
        where: { slug: token },
        include: {
            gallery: {
                include: {
                    project: true
                }
            }
        }
    });

    const galleryName = section?.gallery?.project?.name || 'Upload Photos';

    return {
        title: `${galleryName} | Closerlens`,
        description: 'Share your photos with the event organizer',
        robots: 'noindex, nofollow',
    };
}
