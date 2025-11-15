import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface SchemaConflictRequest {
    file_id: string;
    action: 'overwrite' | 'append' | 'create_new_version' | 'reject';
    new_schema?: any;
    conflict_reason?: string;
}

interface SchemaConflictResponse {
    success: boolean;
    message?: string;
    new_table_name?: string;
    record_count?: number;
    error?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { file_id, action, new_schema, conflict_reason }: SchemaConflictRequest = await req.json();

        if (!file_id || !action) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Get current file and schema information
        const { data: fileRecord, error: fileError } = await supabase
            .from('files_metadata')
            .select('id, name, table_name, storage_type, record_count')
            .eq('id', file_id)
            .single();

        if (fileError || !fileRecord) {
            return NextResponse.json(
                { success: false, error: 'File not found' },
                { status: 404 }
            );
        }

        const { data: currentSchema, error: schemaError } = await supabase
            .from('json_schemas')
            .select('id, schema, storage_type')
            .eq('file_id', file_id)
            .single();

        switch (action) {
            case 'overwrite':
                return await handleOverwrite(fileRecord, currentSchema, new_schema);

            case 'append':
                return await handleAppend(fileRecord, new_schema);

            case 'create_new_version':
                return await handleCreateNewVersion(fileRecord, currentSchema, new_schema, conflict_reason);

            case 'reject':
                return await handleReject(fileRecord, conflict_reason);

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action' },
                    { status: 400 }
                );
        }

    } catch (error: any) {
        console.error('Schema conflict handling error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function handleOverwrite(
    fileRecord: any,
    currentSchema: any,
    newSchema: any
): Promise<NextResponse<SchemaConflictResponse>> {
    try {
        // Drop existing table if it exists
        if (fileRecord.table_name) {
            const { error: dropError } = await supabase.rpc('drop_table_safely', {
                table_name: fileRecord.table_name
            });

            if (dropError) {
                console.warn('Failed to drop existing table:', dropError);
            }
        }

        // Update schema
        const { error: schemaUpdateError } = await supabase
            .from('json_schemas')
            .update({
                schema: newSchema.schema,
                storage_type: newSchema.storageType,
                updated_at: new Date().toISOString()
            })
            .eq('file_id', fileRecord.id);

        if (schemaUpdateError) {
            throw schemaUpdateError;
        }

        // Create new schema version
        const { error: versionError } = await supabase.rpc('create_schema_version', {
            p_file_id: fileRecord.id,
            p_schema_id: currentSchema.id,
            p_schema: newSchema.schema,
            p_storage_type: newSchema.storageType,
            p_table_name: fileRecord.table_name,
            p_changes_description: 'Schema overwritten due to conflict resolution'
        });

        if (versionError) {
            console.warn('Failed to create schema version:', versionError);
        }

        // TODO: Re-process the JSON file with new schema
        // This would require re-uploading or re-processing the original file

        return NextResponse.json({
            success: true,
            message: 'Schema overwritten successfully. Please re-upload the file to apply changes.'
        });

    } catch (error: any) {
        console.error('Overwrite handling failed:', error);
        return NextResponse.json(
            { success: false, error: `Failed to overwrite schema: ${error.message}` },
            { status: 500 }
        );
    }
}

async function handleAppend(
    fileRecord: any,
    newSchema: any
): Promise<NextResponse<SchemaConflictResponse>> {
    try {
        // For append, we need to check if the new data is compatible with existing schema
        // This is a simplified version - in production, you'd want more sophisticated merging

        if (!fileRecord.table_name) {
            return NextResponse.json(
                { success: false, error: 'No existing table to append to' },
                { status: 400 }
            );
        }

        // Check if new schema is compatible (same structure)
        const { data: existingSchema } = await supabase
            .from('json_schemas')
            .select('schema')
            .eq('file_id', fileRecord.id)
            .single();

        const isCompatible = checkSchemaCompatibility(existingSchema?.schema, newSchema?.schema);

        if (!isCompatible) {
            return NextResponse.json(
                { success: false, error: 'New schema is not compatible with existing table structure' },
                { status: 400 }
            );
        }

        // TODO: Implement actual data appending logic
        // This would require processing the new JSON data and inserting into existing tables

        return NextResponse.json({
            success: true,
            message: 'Append operation prepared. Please upload the additional data.',
            record_count: fileRecord.record_count
        });

    } catch (error: any) {
        console.error('Append handling failed:', error);
        return NextResponse.json(
            { success: false, error: `Failed to append data: ${error.message}` },
            { status: 500 }
        );
    }
}

async function handleCreateNewVersion(
    fileRecord: any,
    currentSchema: any,
    newSchema: any,
    conflictReason?: string
): Promise<NextResponse<SchemaConflictResponse>> {
    try {
        // Generate new table name
        const baseName = fileRecord.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        const timestamp = Date.now();
        const newTableName = `data_${baseName}_v${timestamp}`;

        // Create new schema record
        const { data: newSchemaRecord, error: schemaError } = await supabase
            .from('json_schemas')
            .insert({
                file_id: fileRecord.id,
                schema: newSchema.schema,
                storage_type: newSchema.storageType
            })
            .select('id')
            .single();

        if (schemaError) {
            throw schemaError;
        }

        // Create schema version
        const { error: versionError } = await supabase.rpc('create_schema_version', {
            p_file_id: fileRecord.id,
            p_schema_id: newSchemaRecord.id,
            p_schema: newSchema.schema,
            p_storage_type: newSchema.storageType,
            p_table_name: newTableName,
            p_changes_description: `New version created: ${conflictReason || 'Schema conflict resolved'}`
        });

        if (versionError) {
            console.warn('Failed to create schema version:', versionError);
        }

        // Update file metadata to point to new table
        const { error: updateError } = await supabase
            .from('files_metadata')
            .update({
                table_name: newTableName,
                schema_id: newSchemaRecord.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', fileRecord.id);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: 'New schema version created successfully',
            new_table_name: newTableName
        });

    } catch (error: any) {
        console.error('Create new version failed:', error);
        return NextResponse.json(
            { success: false, error: `Failed to create new version: ${error.message}` },
            { status: 500 }
        );
    }
}

async function handleReject(
    fileRecord: any,
    conflictReason?: string
): Promise<NextResponse<SchemaConflictResponse>> {
    try {
        // Log the rejection
        const { error: logError } = await supabase
            .from('data_processing_logs')
            .insert({
                file_id: fileRecord.id,
                operation_type: 'UPDATE_SCHEMA',
                status: 'FAILED',
                details: {
                    action: 'reject',
                    reason: conflictReason || 'User rejected schema change'
                }
            });

        if (logError) {
            console.warn('Failed to log rejection:', logError);
        }

        return NextResponse.json({
            success: true,
            message: 'Schema change rejected. Existing table preserved.',
            record_count: fileRecord.record_count
        });

    } catch (error: any) {
        console.error('Reject handling failed:', error);
        return NextResponse.json(
            { success: false, error: `Failed to reject schema change: ${error.message}` },
            { status: 500 }
        );
    }
}

function checkSchemaCompatibility(existingSchema: any, newSchema: any): boolean {
    // Simplified compatibility check
    // In production, this would be much more sophisticated

    if (!existingSchema || !newSchema) return false;

    // Check if both are arrays or both are objects
    if (Array.isArray(existingSchema) !== Array.isArray(newSchema)) {
        return false;
    }

    if (Array.isArray(existingSchema)) {
        // For arrays, check if item schemas are compatible
        return checkSchemaCompatibility(existingSchema[0], newSchema[0]);
    }

    // For objects, check if all required fields in existing schema exist in new schema
    if (existingSchema.properties && newSchema.properties) {
        const existingFields = Object.keys(existingSchema.properties);
        const newFields = Object.keys(newSchema.properties);

        // All existing fields must be present in new schema
        return existingFields.every(field => newFields.includes(field));
    }

    return true;
}
