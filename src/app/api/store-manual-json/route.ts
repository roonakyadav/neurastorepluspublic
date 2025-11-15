import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { processJSONData, createTablesAndInsertData } from '@/lib/utils/jsonProcessor';

export async function POST(request: NextRequest) {
    try {
        const { jsonText } = await request.json();

        // Validate required fields
        if (!jsonText || typeof jsonText !== 'string') {
            return NextResponse.json(
                { error: 'jsonText is required and must be a string', code: 'MISSING_JSON_TEXT' },
                { status: 400 }
            );
        }

        // Validate JSON
        let parsedJson: any;
        try {
            parsedJson = JSON.parse(jsonText);
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid JSON format', code: 'INVALID_JSON' },
                { status: 400 }
            );
        }

        // Generate temp file name
        const timestamp = Date.now();
        const fileName = `manual_${timestamp}.json`;

        // Create file metadata entry
        const fileMetadata = {
            name: fileName,
            size: Buffer.byteLength(jsonText, 'utf8'),
            mime_type: 'application/json',
            category: 'JSON',
            confidence: 1,
            ai_tags: [],
            uploaded_at: new Date().toISOString(),
            public_url: null, // No actual file uploaded
            folder_path: 'manual/',
            raw_json: jsonText, // Store the raw JSON text
        };

        const { data: fileRecord, error: insertError } = await supabase
            .from('files_metadata')
            .insert([fileMetadata])
            .select('id')
            .single();

        if (insertError) {
            console.error('File metadata insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to create file metadata', code: 'METADATA_INSERT_FAILED' },
                { status: 500 }
            );
        }

        const fileId = fileRecord.id;

        // Process the JSON data using existing APIs
        try {
            console.log('Processing JSON data for storage...');

            // Determine if it's an array of objects
            const isArray = Array.isArray(parsedJson);
            const dataToProcess = isArray ? parsedJson : [parsedJson];

            if (dataToProcess.length === 0) {
                throw new Error('No data to process');
            }

            // Check if data is suitable for SQL storage
            const firstItem = dataToProcess[0];
            const isSQLSuitable = typeof firstItem === 'object' &&
                firstItem !== null &&
                !Array.isArray(firstItem) &&
                Object.keys(firstItem).length > 0;

            if (!isSQLSuitable) {
                // Store as NoSQL/raw JSON
                await supabase
                    .from('files_metadata')
                    .update({
                        storage_type: 'NoSQL',
                        record_count: dataToProcess.length,
                        json_type: 'nosql',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', fileId);

                console.log('Stored as NoSQL data');
            } else {
                // Create table and insert data using existing APIs
                const tableName = `data_manual_${fileId.replace(/-/g, '_')}`;

                // Infer schema from first item
                const schema: Record<string, string> = {};
                for (const [key, value] of Object.entries(firstItem)) {
                    if (key === 'id') continue; // Skip id as it's auto-generated
                    schema[key] = typeof value;
                }

                console.log('Creating table with schema:', schema);

                // Create the table
                const createResponse = await fetch(`${request.nextUrl.origin}/api/create-sql-table`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileId,
                        tableName,
                        schema
                    }),
                });

                const createResult = await createResponse.json();

                if (!createResponse.ok && createResult.code !== 'TABLE_EXISTS') {
                    throw new Error(`Failed to create table: ${createResult.error}`);
                }

                console.log('Table creation result:', createResult);

                // Update metadata to ensure it's linked to the table
                // This is needed regardless of whether table was created or already existed
                if (!supabaseAdmin) {
                    throw new Error('Admin client not available for metadata update');
                }
                const { error: metadataError } = await supabaseAdmin
                    .from('files_metadata')
                    .update({
                        table_name: tableName,
                        storage_type: 'SQL',
                        json_type: 'sql',
                        record_count: 0, // Will be updated after insert
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', fileId);

                if (metadataError) {
                    console.error('Metadata update error:', metadataError);
                    throw new Error(`Failed to update metadata: ${metadataError.message}`);
                }

                console.log('Metadata updated successfully for fileId:', fileId, 'tableName:', tableName);

                // Insert the data
                const insertResponse = await fetch(`${request.nextUrl.origin}/api/insert-sql-rows`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileId,
                        tableName,
                        records: dataToProcess
                    }),
                });

                const insertResult = await insertResponse.json();

                if (!insertResponse.ok) {
                    throw new Error(`Failed to insert data: ${insertResult.error}`);
                }

                console.log('Data insertion result:', insertResult);
            }

        } catch (processingError) {
            console.error('JSON processing error:', processingError);
            // Clean up the metadata entry if processing failed
            await supabase
                .from('files_metadata')
                .delete()
                .eq('id', fileId);

            return NextResponse.json(
                { error: `Failed to process JSON: ${processingError instanceof Error ? processingError.message : String(processingError)}`, code: 'PROCESSING_FAILED' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'JSON stored successfully',
            fileId,
            fileName,
        });

    } catch (error: unknown) {
        console.error('Store manual JSON API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
