import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

// Fetch actual table columns from information_schema
async function getTableColumns(tableName: string): Promise<string[]> {
    if (!supabaseAdmin) {
        throw new Error('Admin client not available');
    }

    // Use direct query instead of RPC
    const { data, error } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('column_name');

    if (error) {
        console.error('Error fetching table columns:', error);
        throw new Error(`Failed to fetch table schema: ${error.message}`);
    }

    // Extract column names from the result
    const columns = data?.map((row: any) => row.column_name) || [];
    return columns;
}

// Validate that record keys match actual DB columns
function validateRecordAgainstTable(record: Record<string, unknown>, dbColumns: string[]): { valid: boolean; extraKeys?: string[] } {
    const recordKeys = Object.keys(record);

    // Check for extra keys (record has keys that table doesn't have)
    // Ignore internal columns that are auto-handled
    const internalColumns = ['id', 'file_id', 'created_at', 'updated_at'];
    const extraKeys = recordKeys.filter(key => !dbColumns.includes(key) && !internalColumns.includes(key));

    return {
        valid: extraKeys.length === 0,
        extraKeys: extraKeys.length > 0 ? extraKeys : undefined
    };
}



export async function POST(request: NextRequest) {
    try {
        const { fileId, tableName, records } = await request.json();

        // Validate required fields
        if (!fileId || !tableName || !records) {
            return NextResponse.json(
                { error: 'fileId, tableName, and records are required', code: 'MISSING_PAYLOAD' },
                { status: 400 }
            );
        }

        if (!Array.isArray(records)) {
            return NextResponse.json(
                { error: 'records must be an array', code: 'MISSING_PAYLOAD' },
                { status: 400 }
            );
        }

        if (records.length === 0) {
            return NextResponse.json(
                { error: 'records array cannot be empty', code: 'MISSING_PAYLOAD' },
                { status: 400 }
            );
        }

        // Validate file exists and has SQL table
        if (!supabaseAdmin) {
            console.error('supabaseAdmin not available for file metadata read');
            return NextResponse.json(
                { error: 'Admin client not available', code: 'ADMIN_CLIENT_UNAVAILABLE' },
                { status: 500 }
            );
        }
        const { data: fileRecord, error: fileError } = await supabaseAdmin
            .from('files_metadata')
            .select('id, name, table_name, storage_type, schema_id, record_count')
            .eq('id', fileId)
            .single();

        if (fileError || !fileRecord) {
            return NextResponse.json(
                { error: 'File not found', code: 'FILE_NOT_FOUND' },
                { status: 404 }
            );
        }

        if (fileRecord.storage_type !== 'SQL' || fileRecord.table_name !== tableName) {
            return NextResponse.json(
                { error: 'Table not found or does not belong to this file', code: 'TABLE_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Transform records into DB-ready rows
        console.log('Transforming records for insertion, fileId:', fileId);
        const rowsWithFileId = records.map((row: any) => {
            const dbRow: any = { file_id: fileId };
            // Copy all keys from the record (the table should have been created with the right columns)
            for (const key of Object.keys(row)) {
                dbRow[key] = row[key];
            }
            return dbRow;
        });

        console.log('Rows ready for insertion:', rowsWithFileId.length, 'rows');

        // Execute INSERT using Supabase client
        if (!supabaseAdmin) {
            console.error('supabaseAdmin not available for insert');
            return NextResponse.json(
                { error: 'Admin client not available', code: 'ADMIN_CLIENT_UNAVAILABLE' },
                { status: 500 }
            );
        }
        const { error: insertError } = await supabaseAdmin!
            .from(tableName)
            .insert(rowsWithFileId);

        if (insertError) {
            console.error('Insert API error:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 400 });
        }

        // Update record count in files_metadata
        const { error: updateError } = await supabaseAdmin
            .from('files_metadata')
            .update({
                record_count: (fileRecord.record_count || 0) + records.length,
                updated_at: new Date().toISOString()
            })
            .eq('id', fileId);

        if (updateError) {
            console.error('Metadata update error:', updateError);
            // Don't fail the request, just log the error
        }

        return NextResponse.json({ message: 'Rows inserted successfully' });

    } catch (error: unknown) {
        console.error('Insert SQL rows API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
