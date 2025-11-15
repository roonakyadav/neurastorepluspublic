import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('fileId');

        if (!fileId) {
            return NextResponse.json(
                { error: 'fileId is required', code: 'MISSING_FILE_ID' },
                { status: 400 }
            );
        }

        // Fetch metadata from files_metadata table
        const { data: metadata, error } = await supabase
            .from('files_metadata')
            .select('*')
            .eq('id', fileId)
            .single();

        if (error || !metadata) {
            return NextResponse.json(
                { error: 'File not found', code: 'FILE_NOT_FOUND' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            metadata
        });

    } catch (error: unknown) {
        console.error('File metadata API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { fileId, updates } = await request.json();

        if (!fileId) {
            console.error('POST /api/file-metadata: Missing fileId parameter');
            return NextResponse.json(
                { error: 'fileId is required', code: 'MISSING_FILE_ID' },
                { status: 400 }
            );
        }

        if (!updates || typeof updates !== 'object') {
            console.error('POST /api/file-metadata: Invalid updates parameter:', updates);
            return NextResponse.json(
                { error: 'updates must be a valid object', code: 'INVALID_UPDATES' },
                { status: 400 }
            );
        }

        console.log('POST /api/file-metadata: Attempting to update metadata for fileId:', fileId, 'with updates:', updates);

        // Update metadata in files_metadata table using admin client (bypasses RLS)
        // This ensures updates work even if RLS policies are in place
        if (!supabaseAdmin) {
            console.error('POST /api/file-metadata: supabaseAdmin not available - SUPABASE_SERVICE_KEY not set');
            return NextResponse.json(
                { error: 'Admin client not available', code: 'ADMIN_CLIENT_UNAVAILABLE' },
                { status: 500 }
            );
        }

        const { data: updatedMetadata, error } = await supabaseAdmin
            .from('files_metadata')
            .update(updates)
            .eq('id', fileId)
            .select('*')
            .single();

        if (error) {
            console.error('POST /api/file-metadata: Metadata update failed:', {
                fileId,
                updates,
                error: {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                }
            });
            return NextResponse.json(
                {
                    error: 'Failed to update metadata',
                    details: error.message,
                    code: 'UPDATE_FAILED'
                },
                { status: 500 }
            );
        }

        console.log('POST /api/file-metadata: Metadata updated successfully:', {
            fileId,
            updatedMetadata
        });

        return NextResponse.json({
            success: true,
            metadata: updatedMetadata,
            message: 'Metadata updated successfully'
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('POST /api/file-metadata: Unexpected error:', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
