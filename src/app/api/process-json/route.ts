import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { classifyJsonForBackend } from '@/lib/classifyJsonServer';

export async function POST(request: NextRequest) {
    try {
        const { fileId, jsonData } = await request.json();

        // Validate required fields
        if (!fileId) {
            return NextResponse.json(
                { error: 'fileId is required', code: 'MISSING_FILE_ID' },
                { status: 400 }
            );
        }

        if (!jsonData) {
            return NextResponse.json(
                { error: 'jsonData is required', code: 'MISSING_JSON_DATA' },
                { status: 400 }
            );
        }

        // Validate file exists in files_metadata
        const { data: existingFile, error: fetchError } = await supabase
            .from('files_metadata')
            .select('id, name, json_type, raw_json')
            .eq('id', fileId)
            .single();

        if (fetchError || !existingFile) {
            return NextResponse.json(
                { error: 'File not found', code: 'FILE_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Classify the JSON data
        const jsonType = classifyJsonForBackend(jsonData);

        // Prepare update data
        const updateData: {
            json_type: string;
            raw_json?: unknown;
        } = {
            json_type: jsonType
        };

        // For nosql, generic, and malformed types, also store raw_json
        if (jsonType === 'nosql' || jsonType === 'generic' || jsonType === 'malformed') {
            updateData.raw_json = jsonData;
        }

        // Update the files_metadata record
        const { data: updatedRecord, error: updateError } = await supabase
            .from('files_metadata')
            .update(updateData)
            .eq('id', fileId)
            .select('*')
            .single();

        if (updateError) {
            console.error('Database update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update file metadata', code: 'UPDATE_FAILED' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'JSON processed and metadata updated successfully',
            fileId,
            jsonType,
            updatedRecord
        });

    } catch (error: unknown) {
        console.error('Process JSON API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
