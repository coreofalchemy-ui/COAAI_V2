import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function logToFile(msg: string) {
    const logPath = 'c:/Users/user/Desktop/coa/ai-fashion-hub-main/debug_absolute.log';
    try {
        fs.appendFileSync(logPath, msg + '\n');
    } catch (e) {
        // ignore
    }
}

logToFile('gcsClient.ts loaded');

// Set environment variable for GCS authentication
// This avoids OpenSSL issues with direct keyFilename parameter
const keyPath = path.join(__dirname, 'keys', 'face-library-key.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

// Initialize GCS client
const storage = new Storage();

// Get bucket instance
const bucketName = process.env.GCS_BUCKET_NAME || 'coa-lookbook-assets';
const bucket = storage.bucket(bucketName);

/**
 * List all files in a specific folder
 */
export async function listFiles(folderPrefix: string): Promise<string[]> {
    try {
        const [files] = await bucket.getFiles({ prefix: folderPrefix });
        return files
            .filter(file => !file.name.endsWith('/')) // Exclude folder markers
            .map(file => file.name);
    } catch (error) {
        console.error(`Error listing files from ${folderPrefix}:`, error);
        throw error;
    }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(filename: string): string {
    return `https://storage.googleapis.com/${bucketName}/${filename}`;
}

/**
 * Get signed URL for a file (temporary access)
 */
export async function getSignedUrl(filename: string, expiresInMinutes: number = 60): Promise<string> {
    try {
        const file = bucket.file(filename);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + expiresInMinutes * 60 * 1000,
        });
        return url;
    } catch (error) {
        console.error(`Error generating signed URL for ${filename}:`, error);
        throw error;
    }
}

/**
 * Check if bucket is accessible
 */
export async function checkBucketAccess(): Promise<boolean> {
    logToFile('Checking bucket access...');
    logToFile(`Key path: ${keyPath}`);
    logToFile(`Bucket name: ${bucketName}`);
    try {
        const [exists] = await bucket.exists();
        logToFile(`Bucket exists result: ${exists}`);
        return exists;
    } catch (error) {
        logToFile(`Error checking bucket access: ${error}`);
        return false;
    }
}

export { bucket, storage };
