import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Derive a 32-byte key from the secret.
// Ideally use a dedicated DATA_ENCRYPTION_KEY, fallback to NEXTAUTH_SECRET.
function getKey(): Buffer {
    const secret = process.env.DATA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('Encryption requires DATA_ENCRYPTION_KEY, NEXTAUTH_SECRET, or AUTH_SECRET to be set.');
    }
    // Simple key derivation (SHA-256) to ensure 32 bytes
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a string using AES-256-GCM.
 * Format: iv:authTag:encryptedText (hex encoded portions joined by :)
 */
export function encrypt(text: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(12); // GCM recommended IV size
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string.
 * If decryption fails or format is invalid, returns the original text (Lazy Migration).
 */
export function decrypt(text: string): string {
    if (!text || !text.includes(':')) {
        // Not in our encrypted format, assume legacy plain text
        return text;
    }

    const parts = text.split(':');
    if (parts.length !== 3) {
        return text; // Invalid format
    }

    try {
        const [ivHex, authTagHex, encryptedText] = parts;
        const key = getKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));

        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        // Decryption failed (maybe executed with wrong key or it was just a string with colons?)
        console.warn('Decryption failed, returning input as is:', error);
        return text;
    }
}
