-- =====================================================
-- NeuraStore+ JSON Processing Setup Scripts
-- =====================================================
-- This file contains all the SQL scripts needed to set up
-- the database for full JSON object processing in NeuraStore+
-- =====================================================

-- =====================================================
-- 1. ENABLE NECESSARY EXTENSIONS
-- =====================================================

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable the pg_stat_statements extension for query performance monitoring
-- (Optional but recommended for production monitoring)
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add new columns to files_metadata table for JSON processing
ALTER TABLE files_metadata
ADD COLUMN IF NOT EXISTS storage_type TEXT,
ADD COLUMN IF NOT EXISTS schema_id UUID,
ADD COLUMN IF NOT EXISTS table_name TEXT,
ADD COLUMN IF NOT EXISTS record_count INTEGER;

-- Create index on table_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_files_metadata_table_name ON files_metadata(table_name);
CREATE INDEX IF NOT EXISTS idx_files_metadata_storage_type ON files_metadata(storage_type);

-- =====================================================
-- 3. CREATE JSON_SCHEMAS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS json_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files_metadata(id) ON DELETE CASCADE,
    schema JSONB NOT NULL,
    storage_type TEXT NOT NULL CHECK (storage_type IN ('SQL', 'NoSQL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for json_schemas
CREATE INDEX IF NOT EXISTS idx_json_schemas_file_id ON json_schemas(file_id);
CREATE INDEX IF NOT EXISTS idx_json_schemas_storage_type ON json_schemas(storage_type);

-- =====================================================
-- 4. CREATE SCHEMA VERSION HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS schema_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files_metadata(id) ON DELETE CASCADE,
    schema_id UUID NOT NULL REFERENCES json_schemas(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    schema JSONB NOT NULL,
    storage_type TEXT NOT NULL CHECK (storage_type IN ('SQL', 'NoSQL')),
    table_name TEXT,
    record_count INTEGER,
    changes_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

-- Create indexes for schema_versions
CREATE INDEX IF NOT EXISTS idx_schema_versions_file_id ON schema_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_schema_versions_schema_id ON schema_versions(schema_id);

-- =====================================================
-- 5. CREATE DATA PROCESSING LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS data_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files_metadata(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('ANALYZE', 'CREATE_TABLE', 'INSERT_DATA', 'UPDATE_SCHEMA', 'ERROR')),
    status TEXT NOT NULL CHECK (status IN ('STARTED', 'SUCCESS', 'FAILED')),
    details JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data_processing_logs
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_file_id ON data_processing_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_operation_type ON data_processing_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_status ON data_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_created_at ON data_processing_logs(created_at);

-- =====================================================
-- 6. CREATE FUNCTIONS FOR AUTOMATED TABLE MANAGEMENT
-- =====================================================

-- Function to log data processing operations
CREATE OR REPLACE FUNCTION log_data_processing(
    p_file_id UUID,
    p_operation_type TEXT,
    p_status TEXT,
    p_details JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_processing_time_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO data_processing_logs (
        file_id,
        operation_type,
        status,
        details,
        error_message,
        processing_time_ms
    ) VALUES (
        p_file_id,
        p_operation_type,
        p_status,
        p_details,
        p_error_message,
        p_processing_time_ms
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create schema version history
CREATE OR REPLACE FUNCTION create_schema_version(
    p_file_id UUID,
    p_schema_id UUID,
    p_schema JSONB,
    p_storage_type TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_record_count INTEGER DEFAULT NULL,
    p_changes_description TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Get the next version number for this file
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM schema_versions
    WHERE file_id = p_file_id;

    -- Insert the new version
    INSERT INTO schema_versions (
        file_id,
        schema_id,
        version_number,
        schema,
        storage_type,
        table_name,
        record_count,
        changes_description
    ) VALUES (
        p_file_id,
        p_schema_id,
        next_version,
        p_schema,
        p_storage_type,
        p_table_name,
        p_record_count,
        p_changes_description
    );

    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to safely drop a table if it exists
CREATE OR REPLACE FUNCTION drop_table_safely(table_name TEXT) RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to execute dynamic SQL (used by Edge Functions)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Execute the SQL query
    EXECUTE sql_query;

    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'message', 'SQL executed successfully',
        'query', sql_query
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'query', sql_query
        );

        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CREATE VIEWS FOR MONITORING AND REPORTING
-- =====================================================

-- View for active tables and their metadata
CREATE OR REPLACE VIEW active_data_tables AS
SELECT
    fm.id as file_id,
    fm.name as file_name,
    fm.table_name,
    fm.storage_type,
    fm.record_count,
    fm.uploaded_at,
    js.schema as json_schema,
    sv.version_number as current_version,
    sv.created_at as last_schema_update
FROM files_metadata fm
LEFT JOIN json_schemas js ON fm.id = js.file_id
LEFT JOIN schema_versions sv ON fm.id = sv.file_id
    AND sv.version_number = (
        SELECT MAX(version_number)
        FROM schema_versions
        WHERE file_id = fm.id
    )
WHERE fm.table_name IS NOT NULL
ORDER BY fm.uploaded_at DESC;

-- View for data processing statistics
CREATE OR REPLACE VIEW data_processing_stats AS
SELECT
    file_id,
    COUNT(*) as total_operations,
    COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_operations,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_operations,
    AVG(processing_time_ms) as avg_processing_time_ms,
    MAX(created_at) as last_operation_at
FROM data_processing_logs
GROUP BY file_id;

-- =====================================================
-- 8. CREATE POLICIES FOR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Note: Enable RLS on tables if needed for multi-tenant applications
-- ALTER TABLE json_schemas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE data_processing_logs ENABLE ROW LEVEL SECURITY;

-- Example policy (uncomment and modify as needed):
-- CREATE POLICY "Users can only access their own file schemas" ON json_schemas
-- FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 9. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to relevant tables
DROP TRIGGER IF EXISTS update_json_schemas_updated_at ON json_schemas;
CREATE TRIGGER update_json_schemas_updated_at
    BEFORE UPDATE ON json_schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. DYNAMIC TABLE CREATION
-- =====================================================

-- Note: Tables are now created dynamically by the Edge Function
-- No pre-created sample tables are needed

-- =====================================================
-- 11. PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Create partial indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_files_metadata_sql_tables
ON files_metadata(table_name)
WHERE storage_type = 'SQL' AND table_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_files_metadata_json_files
ON files_metadata(id)
WHERE mime_type = 'application/json';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify the setup by running this query:
-- SELECT 'Setup complete! Tables created and configured.' as status;

-- To check what tables were created:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%data%' OR tablename LIKE '%schema%' OR tablename LIKE '%processing%';

-- To check the active data tables view:
-- SELECT * FROM active_data_tables LIMIT 5;
