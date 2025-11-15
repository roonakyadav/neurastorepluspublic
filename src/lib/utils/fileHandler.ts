import { fileTypeFromBuffer } from 'file-type';
import { supabase } from '@/lib/supabaseClient';

export interface FileMetadata {
    name: string;
    mime_type: string;
    size: number;
    folder_path: string;
    public_url: string;
    category?: string;
    confidence?: number;
}

export interface UploadResult {
    success: boolean;
    message: string;
    metadata?: FileMetadata;
    error?: string;
}

/**
 * Detect MIME type from file buffer
 */
export async function detectMimeType(buffer: Buffer, filename: string): Promise<string> {
    try {
        const result = await fileTypeFromBuffer(buffer);
        return result?.mime || getMimeTypeFromExtension(filename);
    } catch (error) {
        return getMimeTypeFromExtension(filename);
    }
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'ts': 'application/typescript',
        'py': 'text/x-python',
        'java': 'text/x-java-source',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'ogg': 'audio/ogg',
        'mp4': 'video/mp4',
        'avi': 'video/avi',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'mkv': 'video/x-matroska',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'gz': 'application/gzip',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Determine intelligent folder path based on content analysis and existing structure
 */
export async function getIntelligentFolderPath(
    mimeType: string,
    fileName: string,
    tags: string[] = []
): Promise<string> {
    const basePath = 'media/';

    if (mimeType.startsWith('image/')) {
        // Intelligent image categorization
        let category = 'images';

        // Check filename patterns for better categorization
        const name = fileName.toLowerCase();
        if (name.includes('photo') || name.includes('pic') || name.includes('picture')) {
            category = 'images/photos';
        } else if (name.includes('screenshot') || name.includes('screen')) {
            category = 'images/screenshots';
        } else if (name.includes('logo') || name.includes('brand')) {
            category = 'images/logos';
        } else if (name.includes('diagram') || name.includes('chart') || name.includes('graph')) {
            category = 'images/diagrams';
        } else if (name.includes('avatar') || name.includes('profile') || name.includes('user')) {
            category = 'images/avatars';
        } else if (tags.includes('photo')) {
            category = 'images/photos';
        } else if (tags.includes('screenshot')) {
            category = 'images/screenshots';
        } else if (tags.includes('logo')) {
            category = 'images/logos';
        } else if (tags.includes('diagram')) {
            category = 'images/diagrams';
        }

        return `${basePath}${category}/`;

    } else if (mimeType.startsWith('video/')) {
        // Intelligent video categorization
        let category = 'videos';

        const name = fileName.toLowerCase();
        if (name.includes('tutorial') || name.includes('guide') || name.includes('howto')) {
            category = 'videos/tutorials';
        } else if (name.includes('presentation') || name.includes('demo')) {
            category = 'videos/presentations';
        } else if (name.includes('interview') || name.includes('talk')) {
            category = 'videos/interviews';
        } else if (name.includes('music') || name.includes('song') || name.includes('audio')) {
            category = 'videos/music';
        }

        return `${basePath}${category}/`;

    } else if (mimeType.startsWith('audio/')) {
        // Intelligent audio categorization
        let category = 'audio';

        const name = fileName.toLowerCase();
        if (name.includes('music') || name.includes('song')) {
            category = 'audio/music';
        } else if (name.includes('podcast') || name.includes('talk')) {
            category = 'audio/podcasts';
        } else if (name.includes('interview')) {
            category = 'audio/interviews';
        } else if (name.includes('sound') || name.includes('effect')) {
            category = 'audio/sounds';
        }

        return `${basePath}${category}/`;

    } else if (mimeType === 'application/pdf' || mimeType.includes('document')) {
        // Document categorization
        let category = 'documents';

        const name = fileName.toLowerCase();
        if (name.includes('resume') || name.includes('cv')) {
            category = 'documents/resumes';
        } else if (name.includes('report') || name.includes('analysis')) {
            category = 'documents/reports';
        } else if (name.includes('manual') || name.includes('guide')) {
            category = 'documents/manuals';
        } else if (name.includes('invoice') || name.includes('bill')) {
            category = 'documents/invoices';
        }

        return `${basePath}${category}/`;

    } else if (mimeType === 'application/json') {
        // JSON data categorization
        let category = 'data/json';

        if (tags.includes('users') || tags.includes('contacts')) {
            category = 'data/json/users';
        } else if (tags.includes('settings') || tags.includes('config')) {
            category = 'data/json/config';
        } else if (tags.includes('array') && tags.includes('records')) {
            category = 'data/json/records';
        }

        return `${basePath}${category}/`;

    } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        // Text file categorization
        let category = 'documents/text';

        const name = fileName.toLowerCase();
        if (name.includes('readme') || name.includes('doc')) {
            category = 'documents/text/docs';
        } else if (name.includes('note') || name.includes('todo')) {
            category = 'documents/text/notes';
        } else if (name.includes('script') || name.includes('code')) {
            category = 'documents/text/scripts';
        }

        return `${basePath}${category}/`;

    } else if (mimeType.includes('javascript') || mimeType.includes('typescript')) {
        return `${basePath}code/javascript/`;

    } else if (mimeType.includes('python')) {
        return `${basePath}code/python/`;

    } else if (mimeType.includes('java')) {
        return `${basePath}code/java/`;

    } else if (mimeType.includes('html')) {
        return `${basePath}web/html/`;

    } else if (mimeType.includes('css')) {
        return `${basePath}web/css/`;

    } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
        return `${basePath}archives/`;

    } else {
        return `${basePath}other/`;
    }
}

/**
 * Legacy function for backward compatibility
 */
export function getFolderPath(mimeType: string): string {
    // Default fallback - use intelligent path with empty tags
    return 'media/others/'; // This will be replaced by the intelligent version
}

/**
 * Normalize filename and generate unique path
 */
export function generateFilePath(originalName: string, folderPath: string): string {
    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folderPath}${timestamp}_${sanitizedName}`;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadToSupabase(
    fileBuffer: Buffer,
    filePath: string,
    mimeType: string
): Promise<{ publicUrl: string } | null> {
    try {
        const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                cacheControl: '3600',
                upsert: true,
            });

        if (error) {
            console.error('Supabase upload error:', error.message);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return { publicUrl: urlData.publicUrl };
    } catch (error) {
        console.error('Upload to Supabase failed:', error);
        return null;
    }
}

/**
 * Save metadata to files_metadata table
 */
export async function saveFileMetadata(metadata: FileMetadata): Promise<boolean> {
    try {
        const { error } = await supabase.from('files_metadata').insert([
            {
                name: metadata.name,
                mime_type: metadata.mime_type,
                size: metadata.size,
                uploaded_at: new Date().toISOString(),
                folder_path: metadata.folder_path,
                public_url: metadata.public_url,
                category: metadata.category || 'Unclassified',
                confidence: metadata.confidence || 0,
            },
        ]);

        if (error) {
            console.error('Metadata insert error:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Save metadata failed:', error);
        return false;
    }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
