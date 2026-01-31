import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Use SVG logo - sharp will convert it to PNG automatically
const LOGO_PATH = path.join(process.cwd(), 'public', 'closerlens-logo-qr.svg');
const QR_SIZE = 400;
const LOGO_SIZE = 80;

/**
 * Generate a QR code with the Closerlens logo in the center.
 * Returns the QR code as a PNG Buffer.
 */
export async function generateQRCode(url: string): Promise<Buffer> {
    // Generate base QR code
    const qrBuffer = await QRCode.toBuffer(url, {
        errorCorrectionLevel: 'H', // High error correction to allow logo overlay
        type: 'png',
        width: QR_SIZE,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
    });

    // Check if logo exists
    let logoExists = false;
    try {
        await fs.promises.access(LOGO_PATH);
        logoExists = true;
    } catch {
        // Logo doesn't exist, return plain QR
    }

    if (!logoExists) {
        return qrBuffer;
    }

    // Resize logo
    const logo = await sharp(LOGO_PATH)
        .resize(Math.floor(LOGO_SIZE * 0.8), Math.floor(LOGO_SIZE * 0.8), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }) // Resize logo slightly smaller than background
        .png()
        .toBuffer();

    // Create white background for logo (circle or rounded rect look better)
    // We'll use a simple square with rounded corners via SVG for cleanliness
    const bgSize = LOGO_SIZE;
    const roundedBg = Buffer.from(`
        <svg width="${bgSize}" height="${bgSize}">
            <rect x="0" y="0" width="${bgSize}" height="${bgSize}" rx="${bgSize * 0.2}" ry="${bgSize * 0.2}" fill="white"/>
        </svg>
    `);

    // Composite QR with white background and then logo
    const qrWithLogo = await sharp(qrBuffer)
        .composite([
            {
                input: roundedBg,
                gravity: 'center',
            },
            {
                input: logo,
                gravity: 'center',
            },
        ])
        .png()
        .toBuffer();

    // 3. Add Branding Footer (Extend canvas)
    const FOOTER_HEIGHT = 60;
    const BRAND_TEXT = "closerlens.com";

    // Create footer text SVG
    const footerSvg = Buffer.from(`
        <svg width="${QR_SIZE}" height="${FOOTER_HEIGHT}">
            <rect x="0" y="0" width="${QR_SIZE}" height="${FOOTER_HEIGHT}" fill="white"/>
            <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#6d28d9" text-anchor="middle" dominant-baseline="middle" letter-spacing="1px">${BRAND_TEXT}</text>
        </svg>
    `);

    // Extend original image and composite footer
    const finalResult = await sharp(qrWithLogo)
        .extend({
            top: 0,
            bottom: FOOTER_HEIGHT,
            left: 0,
            right: 0,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .composite([
            {
                input: footerSvg,
                gravity: 'south',
            }
        ])
        .png()
        .toBuffer();

    return finalResult;
}

/**
 * Generate a QR code as a Data URL (for inline display).
 */
export async function generateQRCodeDataURL(url: string): Promise<string> {
    const buffer = await generateQRCode(url);
    return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Generate the upload URL for a QR section.
 */
export function getUploadUrl(sectionSlug: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://closerlens.com';
    return `${baseUrl}/upload/${sectionSlug}`;
}
