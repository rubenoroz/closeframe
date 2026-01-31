import { NextRequest, NextResponse } from 'next/server';
import { validateUpload, processUpload } from '@/lib/services/collaborative.service';

/**
 * POST /api/upload/[token]
 * Guest file upload endpoint (no authentication required).
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    // Get device info from headers
    const deviceId = request.headers.get('x-device-id') || null;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate before processing
        const validation = await validateUpload(token, deviceId, file.size, file.type);

        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error, code: validation.code },
                { status: 400 }
            );
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Process upload
        const result = await processUpload(
            token,
            file.name,
            file.type,
            buffer,
            { deviceId: deviceId || undefined, ipAddress, userAgent }
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            fileId: result.driveFileId,
        });
    } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}


