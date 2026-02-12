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
    // 1. Get Raw QR Data
    const qrData = QRCode.create(url, {
        errorCorrectionLevel: 'H',
        // version constraint removed to allow auto-scaling
    });

    const modules = qrData.modules;
    const size = modules.size;
    const SCALE = 20; // Internal SVG coordinate scale
    const MARGIN = 2; // Modules margin
    const VIEWBOX_SIZE = (size + MARGIN * 2) * SCALE;
    const DATA_RADIUS = SCALE * 0.45; // Dot radius (slightly less than half scale)

    // Helper: partial finder pattern check
    // Returns true if (r, c) is inside one of the 3 finder patterns (7x7 reserved areas)
    const isFinderPattern = (r: number, c: number) => {
        const inTopLeft = r < 7 && c < 7;
        const inTopRight = r < 7 && c >= size - 7;
        const inBottomLeft = r >= size - 7 && c < 7;
        return inTopLeft || inTopRight || inBottomLeft;
    };

    // Build SVG Elements
    const shapes: string[] = [];

    // 1. Background
    shapes.push(`<rect width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" fill="white" />`);

    // 2. Data Dots
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (modules.get(r, c) && !isFinderPattern(r, c)) {
                // Draw rounded dot for data
                const cx = (c + MARGIN) * SCALE + SCALE / 2;
                const cy = (r + MARGIN) * SCALE + SCALE / 2;
                shapes.push(`<circle cx="${cx}" cy="${cy}" r="${DATA_RADIUS}" fill="black" />`);
            }
        }
    }

    // 3. Finder Patterns (Custom Squircles)
    const drawFinderSimple = (rOrigin: number, cOrigin: number) => {
        const x = (cOrigin + MARGIN) * SCALE;
        const y = (rOrigin + MARGIN) * SCALE;

        // Outer 7x7
        const outer = `<rect x="${x}" y="${y}" width="${7 * SCALE}" height="${7 * SCALE}" rx="${2 * SCALE}" fill="black" />`;
        // White Mask 5x5
        const mid = `<rect x="${x + SCALE}" y="${y + SCALE}" width="${5 * SCALE}" height="${5 * SCALE}" rx="${1.5 * SCALE}" fill="white" />`;
        // Inner 3x3
        const inner = `<rect x="${x + 2 * SCALE}" y="${y + 2 * SCALE}" width="${3 * SCALE}" height="${3 * SCALE}" rx="${1 * SCALE}" fill="black" />`;

        return outer + mid + inner;
    };

    shapes.push(drawFinderSimple(0, 0));
    shapes.push(drawFinderSimple(0, size - 7));
    shapes.push(drawFinderSimple(size - 7, 0));

    // Combine SVG
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" width="${QR_SIZE}" height="${QR_SIZE}">
        ${shapes.join('')}
    </svg>`;

    // Initial QR Buffer (Simple QR)
    let resultBuffer: Buffer;

    try {
        resultBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();
    } catch (e) {
        console.error("Critical Sharp Error (Base QR):", e);
        // Fallback to simple QR using qrcode lib only (bypassing sharp)
        try {
            console.log("Attempting fallback to pure QRCode lib...");
            return await QRCode.toBuffer(url, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: QR_SIZE
            });
        } catch (finalError) {
            throw new Error("Failed to generate even base QR code: " + (e instanceof Error ? e.message : String(e)));
        }
    }

    // --- ENHANCEMENTS (Logo + Footer) ---
    // Wrapped in try-catch to ensure we at least return the working QR if assets fail
    try {
        // 1. Center Logo
        let logoExists = false;
        try {
            if (fs.existsSync(LOGO_PATH)) {
                logoExists = true;
            }
        } catch { }

        if (logoExists) {
            // Resize logo
            const logo = await sharp(LOGO_PATH)
                .resize(Math.floor(LOGO_SIZE * 0.8), Math.floor(LOGO_SIZE * 0.8), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toBuffer();

            // White flexible background for logo (Circle)
            const bgSize = LOGO_SIZE;
            const circleBg = Buffer.from(`
                <svg width="${bgSize}" height="${bgSize}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${bgSize / 2}" cy="${bgSize / 2}" r="${bgSize / 2}" fill="white"/>
                </svg>
            `);

            // Composite QR with white background and then logo
            resultBuffer = await sharp(resultBuffer)
                .composite([
                    { input: circleBg as any, gravity: 'center' },
                    { input: logo as any, gravity: 'center' },
                ])
                .png()
                .toBuffer();
        }

        // 2. Branding Footer
        const FOOTER_HEIGHT = 70;
        const FULL_LOGO_PATH = path.join(process.cwd(), 'public', 'logo-white.svg');

        const footerBg = Buffer.from(`
            <svg width="${QR_SIZE}" height="${FOOTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="${QR_SIZE}" height="${FOOTER_HEIGHT}" fill="white"/>
            </svg>
        `);

        let footerOverlay: any = footerBg;

        try {
            if (fs.existsSync(FULL_LOGO_PATH)) {
                let logoSvg = await fs.promises.readFile(FULL_LOGO_PATH, 'utf8');
                logoSvg = logoSvg.replace(/.st0\s*{\s*fill:\s*#f7f7f7;\s*}/g, '.st0{fill:#000000;}');

                const footerLogo = await sharp(Buffer.from(logoSvg))
                    .resize({ height: 40, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer();

                footerOverlay = await sharp(footerBg)
                    .composite([{ input: footerLogo as any, gravity: 'center' }])
                    .png()
                    .toBuffer();
            } else {
                throw new Error("Logo file not found");
            }

        } catch (e) {
            // Fallback text footer if logo fails
            const BRAND_TEXT = "closerlens.com";
            footerOverlay = Buffer.from(`
                <svg width="${QR_SIZE}" height="${FOOTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="${QR_SIZE}" height="${FOOTER_HEIGHT}" fill="white"/>
                    <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#000000" text-anchor="middle" dominant-baseline="middle" letter-spacing="1px">${BRAND_TEXT}</text>
                </svg>
            `);
        }

        // Extend original image and composite footer
        resultBuffer = await sharp(resultBuffer)
            .extend({
                top: 0,
                bottom: FOOTER_HEIGHT,
                left: 0,
                right: 0,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .composite([
                { input: footerOverlay as any, gravity: 'south' }
            ])
            .png()
            .toBuffer();

    } catch (enhancementError) {
        console.error("QR Enhancement failed (returning simple QR):", enhancementError);
        // Do nothing, resultBuffer still holds the valid, unenhanced QR
    }

    return resultBuffer;
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
