import sharp from 'sharp';

/**
 * Valid file signatures (Magic Numbers)
 */
const SIGNATURES: Record<string, string[]> = {
    'image/jpeg': ['ffd8ff'],
    'image/png': ['89504e47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'], // WEBP is a RIFF format, check needed
    'video/mp4': ['66747970', '0000001866747970', '0000002066747970'], // ftyp
    'video/quicktime': ['667479706d6f6f76', '6d6f6f76'], // moov atoms usually
};

export async function validateFileSignature(buffer: Buffer, mimeType: string): Promise<boolean> {
    const hex = buffer.toString('hex', 0, 12); // Check first 12 bytes

    // 1. Use Sharp for images (Deep validation)
    if (mimeType.startsWith('image/')) {
        try {
            const metadata = await sharp(buffer).metadata();
            // Basic format match check
            if (mimeType === 'image/jpeg' && metadata.format !== 'jpeg') return false;
            if (mimeType === 'image/png' && metadata.format !== 'png') return false;
            if (mimeType === 'image/webp' && metadata.format !== 'webp') return false;
            if (mimeType === 'image/heic' && metadata.format !== 'heif') return false;
            return true;
        } catch (e) {
            console.error('Sharp validation failed:', e);
            return false;
        }
    }

    // 2. Fallback / Video Magic Number check
    // This is a basic check. For production video SaaS, use ffprobe/fluent-ffmpeg.
    // For now, this prevents simple text-file-renaming attacks.
    if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
        // Common MP4 signatures (ftyp is usually at offset 4)
        // ISO Base Media file (MPEG-4) v1
        if (hex.includes('66747970')) return true;
        return false;
    }

    return false;
}
