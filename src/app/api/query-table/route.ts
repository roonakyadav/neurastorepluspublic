import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface QueryRequest {
    table_name: string;
    limit?: number;
    offset?: number;
    order_by?: string;
    order_direction?: 'asc' | 'desc';
    filters?: Record<string, any>;
}

interface QueryResult {
    success: boolean;
    data?: any[];
    count?: number;
    columns?: string[];
    error?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { table_name, limit = 100, offset = 0, order_by = 'id', order_direction = 'asc', filters = {} }: QueryRequest = await req.json();

        if (!table_name) {
            return NextResponse.json(
                { success: false, error: 'Table name is required' },
                { status: 400 }
            );
        }

        // Validate that the table exists and user has access
        // First check if this table is associated with a file the user owns
        const { data: fileRecord, error: fileError } = await supabase
            .from('files_metadata')
            .select('id, table_name')
            .eq('table_name', table_name)
            .single();

        if (fileError || !fileRecord) {
            return NextResponse.json(
                { success: false, error: 'Table not found or access denied' },
                { status: 404 }
            );
        }

        // Build the query
        let query = supabase
            .from(table_name)
            .select('*', { count: 'exact' });

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (typeof value === 'string') {
                    query = query.ilike(key, `%${value}%`);
                } else {
                    query = query.eq(key, value);
                }
            }
        });

        // Apply ordering
        query = query.order(order_by, { ascending: order_direction === 'asc' });

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        // Execute query
        const { data, error, count } = await query;

        if (error) {
            console.error('Query execution failed:', error);
            return NextResponse.json(
                { success: false, error: `Query failed: ${error.message}` },
                { status: 500 }
            );
        }

        // Get column information
        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

        const result: QueryResult = {
            success: true,
            data: data || [],
            count: count || 0,
            columns
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Query table error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET endpoint to get table metadata
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tableName = searchParams.get('table');

        if (!tableName) {
            return NextResponse.json(
                { success: false, error: 'Table name is required' },
                { status: 400 }
            );
        }

        // Check if table exists and get metadata
        const { data: fileRecord, error: fileError } = await supabase
            .from('files_metadata')
            .select('id, name, table_name, record_count, storage_type, uploaded_at')
            .eq('table_name', tableName)
            .single();

        if (fileError || !fileRecord) {
            return NextResponse.json(
                { success: false, error: 'Table not found' },
                { status: 404 }
            );
        }

        // Try to get a sample row to infer columns
        let columns: string[] = [];
        try {
            const { data: sampleData, error: sampleError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1)
                .single();

            if (!sampleError && sampleData) {
                columns = Object.keys(sampleData);
            }
        } catch (sampleError) {
            // Table might not exist yet or be empty
            console.warn('Could not get sample data:', sampleError);
        }

        return NextResponse.json({
            success: true,
            table: {
                name: tableName,
                file_name: fileRecord.name,
                record_count: fileRecord.record_count,
                storage_type: fileRecord.storage_type,
                uploaded_at: fileRecord.uploaded_at,
                columns
            }
        });

    } catch (error: any) {
        console.error('Get table metadata error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
