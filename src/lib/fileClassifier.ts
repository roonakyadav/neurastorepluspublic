export function detectFileCategory(name: string, mime: string): string {
    // Classification based on MIME type only
    if (mime.startsWith('image/')) return 'Image';
    if (mime.startsWith('video/')) return 'Video';
    if (mime.startsWith('audio/')) return 'Audio';
    if (mime === 'application/pdf') return 'Document';
    if (mime === 'application/zip' || mime === 'application/x-zip') return 'Archive';

    // Fallback for other types
    return 'Other';
}

export function classifyJSON(content: string): string {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.every(obj => typeof obj === 'object')) {
            const keys = Object.keys(parsed[0] || {});
            if (keys.includes('collection') || keys.includes('document')) return 'NoSQL JSON';
            if (keys.includes('table') || keys.includes('rows')) return 'SQL JSON';
        }
        if (parsed?.tables || parsed?.schema) return 'SQL JSON';
        return 'NoSQL JSON';
    } catch {
        return 'Corrupted JSON';
    }
}
