import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { compareSchemas } from '@/lib/schemaUtils';
import { analyzeBatchSchema } from '@/lib/utils/schemaGenerator';

// Validate that record keys match schema columns
function validateRecordAgainstSchema(record: Record<string, unknown>, schema: Record<string, string>): { valid: boolean; missingKeys?: string[]; extraKeys?: string[] } {
    const recordKeys = Object.keys(record);
    const schemaKeys = Object.keys(schema);

    // Check for missing keys (schema has columns that record doesn't have)
    const missingKeys = schemaKeys.filter(key => !recordKeys.includes(key) && key !== 'id' && key !== 'file_id' && key !== 'created_at' && key !== 'updated_at');

    // Check for extra keys (record has keys that schema doesn't have)
    const extraKeys = recordKeys.filter(key => !schemaKeys.includes(key) && key !== 'id' && key !== 'file_id' && key !== 'created_at' && key !== 'updated_at');

    return {
        valid: missingKeys.length === 0 && extraKeys.length === 0,
        missingKeys: missingKeys.length > 0 ? missingKeys : undefined,
        extraKeys: extraKeys.length > 0 ? extraKeys : undefined
    };
}

// Generate INSERT SQL for multiple rows with embedded values
function generateMultiRowInsertSQL(tableName: string, records: Record<string, unknown>[], schema: Record<string, string>, fileId: string): string {
    if (records.length === 0) {
        throw new Error('No records to insert');
    }

    // Get column names from schema (excluding system columns)
    const columns = Object.keys(schema).filter(key => key !== 'id' && key !== 'file_id' && key !== 'created_at' && key !== 'updated_at');

    // Add file_id column
    const allColumns = ['file_id', ...columns, 'created_at', 'updated_at'];

    const valueRows: string[] = [];

    for (const record of records) {
        const rowValues: string[] = [];

        // Add file_id value
        rowValues.push(`'${fileId}'`);

        // Add values for schema columns
        for (const column of columns) {
            const value = record[column];
            if (value === null || value === undefined) {
                rowValues.push('NULL');
            } else if (typeof value === 'string') {
                // Escape single quotes and wrap in quotes
                rowValues.push(`'${value.replace(/'/g, "''")}'`);
            } else if (typeof value === 'boolean') {
                rowValues.push(value ? 'TRUE' : 'FALSE');
            } else {
                // Numbers and other types
                rowValues.push(String(value));
            }
        }

        // Add timestamps
        const now = new Date().toISOString();
        rowValues.push(`'${now}'`, `'${now}'`);

        valueRows.push(`(${rowValues.join(', ')})`);
    }

    return `INSERT INTO ${tableName} (${allColumns.join(', ')}) VALUES ${valueRows.join(', ')}`;
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
        const { data: fileRecord, error: fileError } = await supabase
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

        // Get schema from json_schemas table
        const { data: schemaRecord, error: schemaError } = await supabase
            .from('json_schemas')
            .select('schema')
            .eq('id', fileRecord.schema_id)
            .single();

        if (schemaError || !schemaRecord) {
            return NextResponse.json(
                { error: 'Schema not found for this table', code: 'TABLE_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Infer schema from incoming records
        const batchAnalysis = analyzeBatchSchema(records);
        const incomingSchema = batchAnalysis.proposedSQLSchema;

        // Compare schemas for conflict detection
        const schemaComparison = compareSchemas(schemaRecord.schema, incomingSchema);

        if (!schemaComparison.isExactMatch) {
            // Schema conflict detected - add to schema_versions and return error
            try {
                await supabase.rpc('create_schema_version', {
                    p_file_id: fileId,
                    p_schema_id: fileRecord.schema_id,
                    p_schema: incomingSchema,
                    p_storage_type: 'SQL',
                    p_table_name: tableName,
                    p_record_count: records.length,
                    p_changes_description: 'Schema conflict detected during row insertion'
                });
            } catch (versionError) {
                console.error('Failed to create schema version:', versionError);
                // Continue with error response even if versioning fails
            }

            return NextResponse.json(
                {
                    error: 'SCHEMA_CONFLICT',
                    details: {
                        missingColumns: schemaComparison.missingColumns,
                        extraColumns: schemaComparison.extraColumns,
                        mismatchedTypes: schemaComparison.mismatchedTypes
                    }
                },
                { status: 409 }
            );
        }

        // Validate all records against schema
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            if (typeof record !== 'object' || record === null) {
                return NextResponse.json(
                    { error: `Record at index ${i} must be an object`, code: 'SCHEMA_MISMATCH' },
                    { status: 400 }
                );
            }

            const validation = validateRecordAgainstSchema(record as Record<string, unknown>, schemaRecord.schema);
            if (!validation.valid) {
                const errors: string[] = [];
                if (validation.missingKeys?.length) {
                    errors.push(`Missing required columns: ${validation.missingKeys.join(', ')}`);
                }
                if (validation.extraKeys?.length) {
                    errors.push(`Extra columns not in schema: ${validation.extraKeys.join(', ')}`);
                }

                return NextResponse.json(
                    {
                        error: `Record at index ${i} does not match schema: ${errors.join('; ')}`,
                        code: 'SCHEMA_MISMATCH'
                    },
                    { status: 400 }
                );
            }
        }

        // Generate INSERT SQL
        const sql = generateMultiRowInsertSQL(tableName, records, schemaRecord.schema, fileId);

        // Execute INSERT using Supabase RPC
        const { error: insertError } = await supabase.rpc('execute_sql', {
            sql_query: sql
        });

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                {
                    error: 'Failed to insert records',
                    details: insertError.message,
                    code: 'INSERT_FAILED'
                },
                { status: 500 }
            );
        }

        // Update record count in files_metadata
        const { error: updateError } = await supabase
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

        return NextResponse.json({
            success: true,
            fileId,
            tableName,
            insertedRows: records.length
        });

    } catch (error: unknown) {
        console.error('Insert SQL rows API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
