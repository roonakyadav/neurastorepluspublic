import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    const supabase = getSupabaseClient();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileId = formData.get("fileId") as string;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const type = file.type.split("/")[0];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    let tags: string[] = [];

    try {
        // Local analysis only - no external APIs allowed

        if (type === "image") {
            // Basic image categorization based on filename and common patterns
            tags = ["image", "visual", "media"];

            // Add specific tags based on filename patterns
            const name = file.name.toLowerCase();
            if (name.includes('photo') || name.includes('pic')) tags.push("photo");
            if (name.includes('screenshot') || name.includes('screen')) tags.push("screenshot");
            if (name.includes('logo')) tags.push("logo");
            if (name.includes('diagram') || name.includes('chart')) tags.push("diagram");
            if (name.includes('avatar') || name.includes('profile')) tags.push("avatar");

            // Add format-specific tags
            if (extension === 'png') tags.push("png", "transparent");
            if (extension === 'jpg' || extension === 'jpeg') tags.push("jpg", "compressed");
            if (extension === 'gif') tags.push("gif", "animated");
            if (extension === 'webp') tags.push("webp", "modern");
            if (extension === 'svg') tags.push("svg", "vector");

        } else if (file.name.endsWith('.json')) {
            // Analyze JSON structure locally
            const jsonContent = await file.text();
            try {
                const jsonData = JSON.parse(jsonContent);
                const isArray = Array.isArray(jsonData);

                if (isArray) {
                    tags = ["json", "array", "data", "structured"];
                    // Analyze array content
                    if (jsonData.length > 0) {
                        const firstItem = jsonData[0];
                        if (typeof firstItem === 'object' && firstItem !== null) {
                            tags.push("objects", "records");
                            // Check for common patterns
                            if (firstItem.hasOwnProperty('id')) tags.push("identified");
                            if (firstItem.hasOwnProperty('name')) tags.push("named");
                            if (firstItem.hasOwnProperty('email')) tags.push("contacts");
                        }
                    }
                } else {
                    tags = ["json", "object", "data", "configuration"];
                    // Analyze object structure
                    const keys = Object.keys(jsonData);
                    if (keys.includes('users') || keys.includes('user')) tags.push("users");
                    if (keys.includes('settings') || keys.includes('config')) tags.push("settings");
                    if (keys.includes('data') || keys.includes('items')) tags.push("dataset");
                }
            } catch {
                tags = ["json", "malformed", "invalid"];
            }

        } else if (extension === 'txt') {
            // Basic text file analysis
            const textContent = await file.text();
            tags = ["text", "document"];

            // Simple content analysis
            if (textContent.includes('function') || textContent.includes('var ') || textContent.includes('const ')) {
                tags.push("code");
            }
            if (textContent.includes('http') || textContent.includes('www.')) {
                tags.push("links");
            }
            if (textContent.length < 100) {
                tags.push("note", "short");
            } else if (textContent.length > 10000) {
                tags.push("long", "comprehensive");
            }

        } else {
            // Comprehensive file type analysis based on extension and MIME type
            switch (extension) {
                case 'mp3':
                    tags = ["audio", "mp3", "music", "media", "sound"];
                    break;
                case 'wav':
                    tags = ["audio", "wav", "sound", "media", "uncompressed"];
                    break;
                case 'm4a':
                    tags = ["audio", "m4a", "media", "aac"];
                    break;
                case 'ogg':
                    tags = ["audio", "ogg", "media", "open"];
                    break;
                case 'mp4':
                    tags = ["video", "mp4", "media", "compressed"];
                    break;
                case 'avi':
                    tags = ["video", "avi", "media", "legacy"];
                    break;
                case 'mov':
                    tags = ["video", "mov", "media", "apple"];
                    break;
                case 'mkv':
                    tags = ["video", "mkv", "media", "open"];
                    break;
                case 'pdf':
                    tags = ["document", "pdf", "text", "portable"];
                    break;
                case 'zip':
                    tags = ["archive", "zip", "compressed", "collection"];
                    break;
                case 'rar':
                    tags = ["archive", "rar", "compressed", "proprietary"];
                    break;
                case '7z':
                    tags = ["archive", "7z", "compressed", "high-ratio"];
                    break;
                case 'gz':
                case 'gzip':
                    tags = ["archive", "gzip", "compressed", "unix"];
                    break;
                case 'js':
                    tags = ["javascript", "code", "script", "web", "programming"];
                    break;
                case 'html':
                    tags = ["html", "web", "markup", "frontend"];
                    break;
                case 'css':
                    tags = ["css", "stylesheet", "web", "design"];
                    break;
                case 'py':
                    tags = ["python", "code", "script", "programming"];
                    break;
                case 'java':
                    tags = ["java", "code", "programming", "enterprise"];
                    break;
                case 'cpp':
                case 'c++':
                case 'cc':
                    tags = ["cpp", "code", "programming", "systems"];
                    break;
                case 'c':
                    tags = ["c", "code", "programming", "low-level"];
                    break;
                case 'php':
                    tags = ["php", "code", "web", "server-side"];
                    break;
                case 'rb':
                    tags = ["ruby", "code", "programming", "web"];
                    break;
                case 'go':
                    tags = ["go", "code", "programming", "systems"];
                    break;
                case 'rs':
                    tags = ["rust", "code", "programming", "systems"];
                    break;
                case 'ts':
                    tags = ["typescript", "code", "script", "web", "typed"];
                    break;
                case 'jsx':
                    tags = ["jsx", "code", "react", "web", "frontend"];
                    break;
                case 'tsx':
                    tags = ["tsx", "code", "react", "typescript", "web"];
                    break;
                case 'vue':
                    tags = ["vue", "code", "framework", "web"];
                    break;
                case 'sql':
                    tags = ["sql", "database", "query", "data"];
                    break;
                case 'csv':
                    tags = ["csv", "data", "spreadsheet", "tabular"];
                    break;
                case 'xml':
                    tags = ["xml", "data", "markup", "structured"];
                    break;
                case 'yaml':
                case 'yml':
                    tags = ["yaml", "configuration", "data", "readable"];
                    break;
                case 'md':
                    tags = ["markdown", "documentation", "text", "readable"];
                    break;
                case 'docx':
                    tags = ["document", "word", "office", "microsoft"];
                    break;
                case 'xlsx':
                    tags = ["spreadsheet", "excel", "office", "microsoft"];
                    break;
                case 'pptx':
                    tags = ["presentation", "powerpoint", "office", "microsoft"];
                    break;
                default:
                    // Fallback based on MIME type
                    if (type === 'audio') tags = ["audio", "media", "sound"];
                    else if (type === 'video') tags = ["video", "media", "visual"];
                    else if (type === 'image') tags = ["image", "visual", "media"];
                    else if (type === 'text') tags = ["text", "document"];
                    else tags = [type || "file", extension || "unknown"];
            }
        }

        // Save tags to database
        if (fileId && tags.length > 0) {
            await (supabase as any)
                .from("files_metadata")
                .update({ ai_tags: tags })
                .eq("id", fileId);
        }

        return NextResponse.json({ tags });

    } catch (error: any) {
        console.error("Local analysis failed:", error);
        return NextResponse.json({ tags: ["analysis_failed"] });
    }
}
