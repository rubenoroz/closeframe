import { prisma } from '@/lib/db';
import { GoogleDriveProvider } from '@/lib/cloud/google-drive-provider';

// Default limits per plan (only Studio and Agency have access)
const PLAN_DEFAULTS = {
    studio: {
        maxFilesTotal: 500,
        maxFilesPerSection: 50,
        maxFilesPerDevice: 15,
        maxFileSizeBytes: 15 * 1024 * 1024, // 15MB
        allowVideo: false,
    },
    agency: {
        maxFilesTotal: 2000,
        maxFilesPerSection: 100,
        maxFilesPerDevice: 25,
        maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
        allowVideo: false, // Only via Super Admin override
    },
};

// Plans that have access to collaborative galleries
const ELIGIBLE_PLANS = ['studio', 'agency'];

/**
 * Check if a plan has access to collaborative galleries.
 */
export function isPlanEligible(planName: string | null | undefined): boolean {
    if (!planName) return false;
    const normalizedName = planName.toLowerCase().replace('plan-', '');
    return ELIGIBLE_PLANS.includes(normalizedName);
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

type Limits = {
    maxFilesTotal: number;
    maxFilesPerSection: number;
    maxFilesPerDevice: number;
    maxFileSizeBytes: number;
    allowVideo: boolean;
};

type ValidationResult = {
    valid: boolean;
    error?: string;
    code?: 'INVALID_TOKEN' | 'GALLERY_INACTIVE' | 'SECTION_INACTIVE' | 'LIMIT_GALLERY' | 'LIMIT_SECTION' | 'LIMIT_DEVICE' | 'INVALID_TYPE' | 'FILE_TOO_LARGE';
};

const driveProvider = new GoogleDriveProvider();

/**
 * Get limits for a gallery based on plan and overrides.
 */
export async function getLimitsForGallery(collaborativeGalleryId: string): Promise<Limits> {
    const gallery = await prisma.collaborativeGallery.findUnique({
        where: { id: collaborativeGalleryId },
        include: {
            project: {
                include: {
                    user: {
                        include: { plan: true }
                    }
                }
            }
        }
    });

    if (!gallery) throw new Error('Gallery not found');

    const rawPlanName = gallery.project.user.plan?.name?.toLowerCase() || 'studio';
    const planName = rawPlanName.replace('plan-', '');
    const defaults = PLAN_DEFAULTS[planName as keyof typeof PLAN_DEFAULTS] || PLAN_DEFAULTS.studio;

    return {
        maxFilesTotal: gallery.maxFilesTotal ?? defaults.maxFilesTotal,
        maxFilesPerSection: gallery.maxFilesPerSection ?? defaults.maxFilesPerSection,
        maxFilesPerDevice: gallery.maxFilesPerDevice ?? defaults.maxFilesPerDevice,
        maxFileSizeBytes: gallery.maxFileSizeBytes ?? defaults.maxFileSizeBytes,
        allowVideo: gallery.allowVideo ?? defaults.allowVideo,
    };
}

/**
 * Validate if an upload is allowed.
 */
export async function validateUpload(
    qrToken: string,
    deviceId: string | null,
    fileSize: number,
    mimeType: string
): Promise<ValidationResult> {
    // Find section by slug
    const section = await prisma.qrSection.findUnique({
        where: { slug: qrToken },
        include: {
            gallery: {
                include: {
                    project: {
                        include: {
                            user: { include: { plan: true } }
                        }
                    }
                }
            }
        }
    });

    if (!section) {
        return { valid: false, error: 'Invalid QR code.', code: 'INVALID_TOKEN' };
    }

    if (!section.gallery.isActive) {
        return { valid: false, error: 'This gallery is not accepting uploads.', code: 'GALLERY_INACTIVE' };
    }

    if (!section.isActive) {
        return { valid: false, error: 'This section is not accepting uploads.', code: 'SECTION_INACTIVE' };
    }

    const limits = await getLimitsForGallery(section.gallery.id);

    // Check file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType.toLowerCase());

    if (!isImage && !isVideo) {
        return { valid: false, error: 'Only photos are allowed (JPG, PNG, HEIC).', code: 'INVALID_TYPE' };
    }

    if (isVideo && !limits.allowVideo) {
        return { valid: false, error: 'Video uploads are not enabled for this gallery.', code: 'INVALID_TYPE' };
    }

    // Check file size
    if (fileSize > limits.maxFileSizeBytes) {
        const maxMB = Math.round(limits.maxFileSizeBytes / (1024 * 1024));
        return { valid: false, error: `File is too large. Maximum size is ${maxMB}MB.`, code: 'FILE_TOO_LARGE' };
    }

    // Check gallery total limit
    const galleryUploads = await prisma.collaborativeUpload.count({
        where: { collaborativeGalleryId: section.gallery.id, status: 'success' }
    });
    if (galleryUploads >= limits.maxFilesTotal) {
        return { valid: false, error: 'This gallery has reached its upload limit.', code: 'LIMIT_GALLERY' };
    }

    // Check section limit
    const sectionUploads = await prisma.collaborativeUpload.count({
        where: { qrSectionId: section.id, status: 'success' }
    });
    if (sectionUploads >= limits.maxFilesPerSection) {
        return { valid: false, error: 'This section has reached its upload limit.', code: 'LIMIT_SECTION' };
    }

    // Check device limit
    if (deviceId) {
        const deviceUploads = await prisma.collaborativeUpload.count({
            where: { collaborativeGalleryId: section.gallery.id, deviceId, status: 'success' }
        });
        if (deviceUploads >= limits.maxFilesPerDevice) {
            return { valid: false, error: 'You have reached your upload limit.', code: 'LIMIT_DEVICE' };
        }
    }

    return { valid: true };
}

/**
 * Enable collaborative gallery for a project.
 */
export async function enableCollaborativeGallery(projectId: string): Promise<{ id: string; driveFolderId: string }> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            cloudAccount: true,
            collaborativeGallery: true,
        }
    });

    if (!project) throw new Error('Project not found');
    if (project.cloudAccount.provider !== 'google') {
        throw new Error('Collaborative galleries only work with Google Drive');
    }
    if (project.collaborativeGallery) {
        // Already exists, just activate it
        await prisma.collaborativeGallery.update({
            where: { id: project.collaborativeGallery.id },
            data: { isActive: true }
        });
        return { id: project.collaborativeGallery.id, driveFolderId: project.collaborativeGallery.driveFolderId || '' };
    }

    // Refresh token and create folder
    const accessToken = await driveProvider.refreshAccessToken(project.cloudAccount.refreshToken || '');
    const folderName = `📷 Uploads - ${project.name}`;
    const driveFolderId = await driveProvider.createFolder(project.rootFolderId, folderName, accessToken);

    const collab = await prisma.collaborativeGallery.create({
        data: {
            projectId,
            isActive: true,
            driveFolderId,
        }
    });

    return { id: collab.id, driveFolderId };
}

/**
 * Create a new QR section.
 */
export async function createQrSection(collaborativeGalleryId: string, name: string): Promise<{ id: string; slug: string; driveFolderId: string }> {
    const gallery = await prisma.collaborativeGallery.findUnique({
        where: { id: collaborativeGalleryId },
        include: {
            project: { include: { cloudAccount: true } }
        }
    });

    if (!gallery) throw new Error('Collaborative gallery not found');
    if (!gallery.driveFolderId) throw new Error('Gallery Drive folder not set');

    // Create subfolder
    const accessToken = await driveProvider.refreshAccessToken(gallery.project.cloudAccount.refreshToken || '');
    const folderName = `QR - ${name}`;
    const driveFolderId = await driveProvider.createFolder(gallery.driveFolderId, folderName, accessToken);

    // Generate unique slug
    const slug = generateSlug();

    const section = await prisma.qrSection.create({
        data: {
            collaborativeGalleryId,
            name,
            slug,
            driveFolderId,
            isActive: true,
        }
    });

    return { id: section.id, slug: section.slug, driveFolderId };
}

/**
 * Process an upload from a guest.
 */
export async function processUpload(
    qrToken: string,
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer,
    metadata: { deviceId?: string; ipAddress?: string; userAgent?: string }
): Promise<{ success: boolean; driveFileId?: string; error?: string }> {
    const section = await prisma.qrSection.findUnique({
        where: { slug: qrToken },
        include: {
            gallery: {
                include: {
                    project: { include: { cloudAccount: true } }
                }
            }
        }
    });

    if (!section) return { success: false, error: 'Invalid QR code' };

    try {
        // Upload to Drive
        const accessToken = await driveProvider.refreshAccessToken(section.gallery.project.cloudAccount.refreshToken || '');
        const driveFileId = await driveProvider.uploadFile(
            section.driveFolderId,
            fileName,
            mimeType,
            fileBuffer,
            accessToken
        );

        // Record in database
        await prisma.collaborativeUpload.create({
            data: {
                collaborativeGalleryId: section.gallery.id,
                qrSectionId: section.id,
                driveFileId,
                fileName,
                mimeType,
                sizeBytes: fileBuffer.length,
                deviceId: metadata.deviceId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                status: 'success',
            }
        });

        // Increment access count
        await prisma.qrSection.update({
            where: { id: section.id },
            data: { accessCount: { increment: 1 } }
        });

        return { success: true, driveFileId };
    } catch (error) {
        console.error('Upload failed:', error);
        return { success: false, error: 'Upload failed' };
    }
}

/**
 * Generate a random URL-safe slug for QR sections.
 */
function generateSlug(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < length; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
}
