# NeuraStore+ Developer Guide

This guide provides detailed information for developers working on NeuraStore+, including how to extend schema logic, add media categories, integrate with Supabase, and handle errors effectively.

## How to Extend Schema Logic

### Understanding Schema Processing

NeuraStore+ automatically analyzes JSON files and determines whether to store them as SQL tables or NoSQL documents. The schema logic is extensible and can be enhanced to support additional data types and processing rules.

### Schema Analysis Components

#### 1. JSON Schema Inference (`src/lib/utils/schemaGenerator.ts`)

The schema inference process analyzes JSON structure recursively:

```typescript
// Core schema inference function
export function inferSchema(data: any, maxDepth: number = 3): SchemaDefinition {
    if (Array.isArray(data)) {
        return inferArraySchema(data, maxDepth);
    } else if (typeof data === 'object' && data !== null) {
        return inferObjectSchema(data, maxDepth);
    } else {
        return inferPrimitiveSchema(data);
    }
}
```

**To extend schema logic:**

1. **Add new data type detection:**
```typescript
function inferCustomType(value: any): SchemaField {
    if (isCustomType(value)) {
        return {
            type: 'custom_type',
            nullable: false,
            metadata: { customProperty: extractCustomProperty(value) }
        };
    }
    // Fallback to existing logic
    return inferPrimitiveSchema(value);
}
```

2. **Modify SQL/NoSQL determination criteria:**
```typescript
export function determineStorageType(schema: SchemaDefinition): 'SQL' | 'NoSQL' {
    // Current criteria
    if (schema.depth > 3) return 'NoSQL';
    if (schema.fieldCount > 50) return 'NoSQL';
    if (!schema.isConsistent) return 'NoSQL';

    // Add custom criteria
    if (hasComplexRelationships(schema)) return 'NoSQL';
    if (requiresSpecialIndexing(schema)) return 'SQL';

    return 'SQL';
}
```

#### 2. Schema Comparison (`src/lib/schemaUtils.ts`)

Schema comparison enables conflict detection and migration planning:

```typescript
export function compareSchemas(
    existingSchema: Record<string, string>,
    newSchema: Record<string, string>
): SchemaComparisonResult {
    // Compare field types, detect missing/extra columns
    // Return detailed differences for migration planning
}
```

**Extending schema comparison:**

```typescript
export function compareAdvancedSchemas(
    existing: AdvancedSchema,
    incoming: AdvancedSchema
): AdvancedComparison {
    const basicComparison = compareSchemas(existing.fields, incoming.fields);

    // Add advanced comparisons
    const relationshipChanges = compareRelationships(existing.relationships, incoming.relationships);
    const constraintChanges = compareConstraints(existing.constraints, incoming.constraints);

    return {
        ...basicComparison,
        relationshipChanges,
        constraintChanges,
        migrationStrategy: determineMigrationStrategy(basicComparison, relationshipChanges)
    };
}
```

### Adding Custom Schema Processors

1. **Create a new schema processor:**
```typescript
// src/lib/schema/processors/customProcessor.ts
export class CustomSchemaProcessor implements SchemaProcessor {
    canProcess(data: any): boolean {
        return this.detectsCustomPattern(data);
    }

    process(data: any): SchemaDefinition {
        // Custom processing logic
        return {
            type: 'custom',
            fields: this.extractCustomFields(data),
            relationships: this.extractCustomRelationships(data)
        };
    }
}
```

2. **Register the processor:**
```typescript
// src/lib/utils/schemaGenerator.ts
const processors: SchemaProcessor[] = [
    new ArrayProcessor(),
    new ObjectProcessor(),
    new CustomSchemaProcessor(), // Add your custom processor
];
```

## How to Add Media Categories

### Current Category System

NeuraStore+ uses MIME-type based categorization in `src/lib/fileClassifier.ts`:

```typescript
export function detectFileCategory(name: string, mime: string): string {
    if (mime.startsWith('image/')) return 'Image';
    if (mime.startsWith('video/')) return 'Video';
    if (mime.startsWith('audio/')) return 'Audio';
    if (mime === 'application/pdf') return 'Document';
    if (mime === 'application/zip') return 'Archive';
    return 'Other';
}
```

### Adding New Categories

#### 1. Extend the Classification Function

```typescript
export function detectFileCategory(name: string, mime: string): string {
    // Existing categories
    if (mime.startsWith('image/')) return 'Image';
    if (mime.startsWith('video/')) return 'Video';
    if (mime.startsWith('audio/')) return 'Audio';
    if (mime === 'application/pdf') return 'Document';
    if (mime === 'application/zip') return 'Archive';

    // New categories
    if (mime === 'application/vnd.ms-powerpoint' ||
        mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        return 'Presentation';
    }

    if (mime === 'application/vnd.ms-excel' ||
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return 'Spreadsheet';
    }

    if (mime.includes('font/') || name.match(/\.(ttf|otf|woff|woff2)$/i)) {
        return 'Font';
    }

    if (mime === 'application/x-iso9660-image' || name.match(/\.(iso|dmg)$/i)) {
        return 'Disk Image';
    }

    return 'Other';
}
```

#### 2. Update Folder Path Logic

Update the folder assignment in upload handlers:

```typescript
// src/app/api/upload/route.ts
function getIntelligentFolderPath(mimeType: string, category: string): string {
    const categoryMap: Record<string, string> = {
        'Image': 'media/images/',
        'Video': 'media/videos/',
        'Audio': 'media/audio/',
        'Document': 'media/documents/',
        'Presentation': 'media/documents/presentations/',
        'Spreadsheet': 'media/documents/spreadsheets/',
        'Font': 'media/fonts/',
        'Archive': 'media/archives/',
        'Disk Image': 'media/disk-images/',
        // Add more mappings
    };

    return categoryMap[category] || 'media/others/';
}
```

#### 3. Update Storage Bucket Structure

Ensure Supabase storage buckets support new categories:

```sql
-- Create new buckets or folders as needed
-- This is handled automatically by the folder path logic
```

#### 4. Update UI Components

Update category displays and filtering:

```typescript
// src/components/CategoryFilter.tsx
const categories = [
    'All',
    'Image',
    'Video',
    'Audio',
    'Document',
    'Presentation',  // New category
    'Spreadsheet',   // New category
    'Font',          // New category
    'Archive',
    'Other'
];
```

### Advanced Category Detection

For content-based categorization beyond MIME types:

```typescript
export async function detectAdvancedCategory(
    buffer: Buffer,
    mime: string,
    name: string
): Promise<CategoryResult> {
    // Content analysis
    if (mime.startsWith('image/')) {
        const imageType = await analyzeImageContent(buffer);
        return {
            category: `Image (${imageType})`,
            confidence: 0.9,
            tags: ['visual', imageType]
        };
    }

    // Text analysis for documents
    if (mime === 'text/plain') {
        const textAnalysis = await analyzeTextContent(buffer);
        return {
            category: textAnalysis.isCode ? 'Code' : 'Document',
            confidence: textAnalysis.confidence,
            tags: textAnalysis.tags
        };
    }

    // Fallback to basic detection
    return {
        category: detectFileCategory(name, mime),
        confidence: 0.7,
        tags: []
    };
}
```

## How Supabase Integration Works

### Client Setup

NeuraStore+ uses the Supabase JavaScript client for all database and storage operations:

```typescript
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Database Operations

#### File Metadata Management

```typescript
// Insert file metadata
const { data, error } = await supabase
    .from('files_metadata')
    .insert([{
        name: file.name,
        size: file.size,
        mime_type: mimeType,
        category: category,
        public_url: publicUrl,
        folder_path: folderPath
    }])
    .select('id')
    .single();
```

#### JSON Schema Storage

```typescript
// Store JSON schema
const { data, error } = await supabase
    .from('json_schemas')
    .insert([{
        file_id: fileId,
        schema: schemaDefinition,
        storage_type: storageType
    }]);
```

### Storage Operations

#### File Upload to Storage

```typescript
// src/lib/utils/fileHandler.ts
export async function uploadToSupabase(
    buffer: Buffer,
    filePath: string,
    mimeType: string
): Promise<{ publicUrl: string } | null> {
    const { data, error } = await supabase.storage
        .from('media')  // Storage bucket name
        .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: false
        });

    if (error) {
        console.error('Storage upload error:', error);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

    return { publicUrl };
}
```

### Edge Functions

NeuraStore+ uses Supabase Edge Functions for complex JSON processing:

```typescript
// Calling an Edge Function
const { data, error } = await supabase.functions.invoke('process-json', {
    body: {
        jsonData,
        fileId,
        fileName,
        fileMetadata
    }
});
```

#### Edge Function Implementation

```typescript
// supabase/functions/process-json/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    const { jsonData, fileId, fileName } = await req.json()

    // Process JSON data
    const result = await processJSONData(jsonData, fileId, fileName)

    return new Response(
        JSON.stringify(result),
        { headers: { 'Content-Type': 'application/json' } }
    )
})
```

### Real-time Subscriptions

For real-time features (future enhancement):

```typescript
// Subscribe to file upload events
const channel = supabase
    .channel('file_uploads')
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'files_metadata' },
        (payload) => {
            console.log('New file uploaded:', payload.new)
        }
    )
    .subscribe()
```

### Authentication (Future Enhancement)

```typescript
// User authentication
const { data, error } = await supabase.auth.signUp({
    email: 'user@example.com',
    password: 'password'
})

// Row Level Security (RLS) policies
-- Enable RLS on tables
ALTER TABLE files_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy for user isolation
CREATE POLICY "Users can only access their own files" ON files_metadata
FOR ALL USING (auth.uid() = user_id);
```

## Error Handling Approach

### Error Classification

NeuraStore+ implements a comprehensive error handling strategy with categorized error codes:

```typescript
// Error codes and their meanings
const ERROR_CODES = {
    // Validation errors (400)
    INVALID_FORM_DATA: 'Form data parsing failed',
    NO_FILE: 'No file was uploaded',
    FILE_TOO_LARGE: 'File exceeds size limit',

    // Processing errors (400)
    FILE_READ_ERROR: 'Failed to read file data',
    MIME_DETECTION_FAILED: 'Could not determine file type',
    INVALID_JSON: 'JSON file is malformed',

    // Storage errors (500)
    STORAGE_UPLOAD_FAILED: 'Failed to upload to Supabase Storage',
    METADATA_SAVE_FAILED: 'Failed to save file metadata',

    // Network errors (500)
    NETWORK_ERROR: 'Network connectivity issue',
    TIMEOUT_ERROR: 'Operation timed out',

    // System errors (500)
    UNKNOWN_ERROR: 'Unexpected system error'
} as const;
```

### Error Response Structure

All API endpoints return consistent error responses:

```typescript
interface ErrorResponse {
    error: string;        // Human-readable error message
    code: string;         // Machine-readable error code
    details?: string;     // Additional debug information (dev mode only)
    publicUrl?: string;   // File URL if upload succeeded but metadata failed
}
```

### Error Handling in API Routes

```typescript
// src/app/api/upload/route.ts
export async function POST(req: Request) {
    try {
        // Main processing logic
        const result = await processUpload(req);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Upload processing failed:", error);

        // Categorize error and provide appropriate response
        const errorResponse = categorizeError(error);

        return NextResponse.json(
            errorResponse,
            { status: errorResponse.statusCode }
        );
    }
}

function categorizeError(error: any): ErrorResponse & { statusCode: number } {
    if (error.message?.includes("network")) {
        return {
            error: "Network error. Please check your connection.",
            code: "NETWORK_ERROR",
            statusCode: 503
        };
    }

    if (error.message?.includes("timeout")) {
        return {
            error: "Operation timed out. Please try again.",
            code: "TIMEOUT_ERROR",
            statusCode: 408
        };
    }

    // Default error
    return {
        error: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
}
```

### Client-Side Error Handling

```typescript
// src/components/FileUpload.tsx
const handleUpload = async (file: File) => {
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle different error types
            switch (result.code) {
                case 'FILE_TOO_LARGE':
                    showToast('File is too large. Maximum size is 50MB.', 'error');
                    break;
                case 'NETWORK_ERROR':
                    showToast('Network error. Please check your connection.', 'error');
                    break;
                default:
                    showToast(result.error || 'Upload failed.', 'error');
            }
            return;
        }

        // Success handling
        showToast('File uploaded successfully!', 'success');
        onUploadComplete(result);

    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed. Please try again.', 'error');
    }
};
```

### Logging and Monitoring

#### Data Processing Logs

All processing operations are logged for monitoring:

```typescript
// src/lib/utils/logging.ts
export async function logProcessingOperation(
    fileId: string,
    operation: string,
    status: 'STARTED' | 'SUCCESS' | 'FAILED',
    details?: any,
    errorMessage?: string,
    processingTimeMs?: number
) {
    const { error } = await supabase
        .from('data_processing_logs')
        .insert([{
            file_id: fileId,
            operation_type: operation,
            status,
            details,
            error_message: errorMessage,
            processing_time_ms: processingTimeMs
        }]);

    if (error) {
        console.error('Failed to log processing operation:', error);
    }
}
```

#### Error Recovery Strategies

1. **Retry Logic**: For transient failures
```typescript
async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
}
```

2. **Graceful Degradation**: Continue with partial success
```typescript
// If metadata save fails but file upload succeeds,
// still return the public URL for user access
if (metadataError) {
    return NextResponse.json({
        error: "Metadata save failed, but file is accessible",
        code: "METADATA_SAVE_FAILED",
        publicUrl // User can still access the file
    }, { status: 207 }); // 207 Multi-Status
}
```

3. **Rollback Mechanisms**: For failed operations
```typescript
async function processWithRollback(operation: () => Promise<void>) {
    const rollbackActions: (() => Promise<void>)[] = [];

    try {
        // Perform operation with rollback tracking
        await operation();
    } catch (error) {
        // Execute rollback actions in reverse order
        for (const rollback of rollbackActions.reverse()) {
            try {
                await rollback();
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        }
        throw error;
    }
}
```

### Testing Error Scenarios

```typescript
// test_json_pipeline.js
describe('Error Handling', () => {
    test('handles malformed JSON gracefully', async () => {
        const result = await processJSONFile('invalid json content');
        expect(result.storageType).toBe('NoSQL');
        expect(result.error).toBeDefined();
    });

    test('handles network timeouts', async () => {
        // Mock network failure
        const result = await uploadWithTimeout();
        expect(result.code).toBe('TIMEOUT_ERROR');
    });
});
```

This comprehensive error handling approach ensures NeuraStore+ provides clear feedback to users while maintaining system stability and data integrity.
