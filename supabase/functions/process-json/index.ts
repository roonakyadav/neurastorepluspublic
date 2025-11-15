import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NormalizedTable {
    name: string;
    columns: ColumnDefinition[];
    data: any[];
    foreignKeys?: ForeignKey[];
}

interface ColumnDefinition {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    references?: string;
}

interface ForeignKey {
    column: string;
    referencesTable: string;
    referencesColumn: string;
}

interface JSONProcessingResult {
    storageType: 'SQL' | 'NoSQL';
    reasoning: string;
    tables: NormalizedTable[];
    recordCount: number;
    schemaId?: string;
}

interface ProcessRequest {
    jsonData: any;
    fileId: string;
    fileName: string;
    fileMetadata: {
        name: string;
        size: number;
        mime_type: string;
    };
}

serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Initialize Supabase client with service role key
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const { jsonData, fileId, fileName, fileMetadata }: ProcessRequest = await req.json()

        console.log(`[EDGE_FUNCTION] Processing JSON for file: ${fileId} (${fileName})`)

        // Start processing log
        const startTime = Date.now()
        await logProcessingOperation(supabase, fileId, 'ANALYZE', 'STARTED', {
            fileName,
            fileSize: fileMetadata.size,
            mimeType: fileMetadata.mime_type
        })

        // Process JSON data
        const result = await processJSONData(jsonData, fileId, fileName)

        if (result.storageType === 'NoSQL') {
            // Handle NoSQL storage
            await handleNoSQLStorage(supabase, result, fileId, fileName, fileMetadata)
        } else {
            // Handle SQL storage
            await handleSQLStorage(supabase, result, fileId, fileName, fileMetadata)
        }

        const processingTime = Date.now() - startTime

        // Log completion
        await logProcessingOperation(supabase, fileId, 'ANALYZE', 'SUCCESS', {
            storageType: result.storageType,
            recordCount: result.recordCount,
            tableCount: result.tables.length,
            processingTimeMs: processingTime
        })

        return new Response(
            JSON.stringify({
                success: true,
                storageType: result.storageType,
                recordCount: result.recordCount,
                tableCount: result.tables.length,
                reasoning: result.reasoning
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        console.error('[EDGE_FUNCTION] Error:', error)

        // Log error
        try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, supabaseServiceKey)

            const { fileId } = await req.json().catch(() => ({ fileId: 'unknown' }))

            await logProcessingOperation(supabase, fileId, 'ANALYZE', 'FAILED', {
                error: error.message,
                stack: error.stack
            }, error.message)
        } catch (logError) {
            console.error('[EDGE_FUNCTION] Failed to log error:', logError)
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            },
        )
    }
})

/**
 * Main function to process JSON data and convert to database entities
 */
async function processJSONData(
    jsonData: any,
    fileId: string,
    fileName: string
): Promise<JSONProcessingResult> {
    // Detect if single object or array
    const isArray = Array.isArray(jsonData)
    const dataToProcess = isArray ? jsonData : [jsonData]

    if (dataToProcess.length === 0) {
        throw new Error('No data to process')
    }

    // Analyze structure to decide SQL vs NoSQL
    const { storageType, reasoning } = analyzeStorageType(dataToProcess)

    if (storageType === 'NoSQL') {
        // For NoSQL, just store the raw JSON
        return {
            storageType: 'NoSQL',
            reasoning,
            tables: [],
            recordCount: dataToProcess.length
        }
    }

    // For SQL, normalize the data structure
    const tables = normalizeDataStructure(dataToProcess, fileName)

    return {
        storageType: 'SQL',
        reasoning,
        tables,
        recordCount: dataToProcess.length
    }
}

/**
 * Analyze data structure to determine SQL vs NoSQL storage
 */
function analyzeStorageType(data: any[]): { storageType: 'SQL' | 'NoSQL'; reasoning: string } {
    if (data.length === 0) {
        return { storageType: 'SQL', reasoning: 'Empty data, defaulting to SQL' }
    }

    const firstItem = data[0]

    // Check if all items are objects with consistent structure
    const hasConsistentStructure = data.every(item =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item)
    )

    if (!hasConsistentStructure) {
        return {
            storageType: 'NoSQL',
            reasoning: 'Data contains non-object items or inconsistent structure'
        }
    }

    // Check for deeply nested structures
    const maxDepth = Math.max(...data.map(item => getObjectDepth(item)))
    if (maxDepth > 3) {
        return {
            storageType: 'NoSQL',
            reasoning: `Data has deep nesting (depth ${maxDepth}), better suited for NoSQL`
        }
    }

    // Check for complex arrays or objects within arrays
    const hasComplexArrays = data.some(item =>
        Object.values(item).some(value =>
            Array.isArray(value) && value.length > 0 &&
            typeof value[0] === 'object' && value[0] !== null
        )
    )

    if (hasComplexArrays) {
        return {
            storageType: 'NoSQL',
            reasoning: 'Contains complex nested arrays, requires NoSQL document structure'
        }
    }

    // Check average number of keys
    const avgKeys = data.reduce((sum, item) => sum + Object.keys(item).length, 0) / data.length
    if (avgKeys > 50) {
        return {
            storageType: 'NoSQL',
            reasoning: `High number of fields per record (${avgKeys.toFixed(1)}), better for NoSQL`
        }
    }

    return {
        storageType: 'SQL',
        reasoning: `Regular tabular structure with ${avgKeys.toFixed(1)} average fields, suitable for SQL`
    }
}

/**
 * Get the maximum depth of an object
 */
function getObjectDepth(obj: any, currentDepth: number = 0): number {
    if (currentDepth >= 10) return currentDepth // Prevent infinite recursion

    if (typeof obj !== 'object' || obj === null) {
        return currentDepth
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) return currentDepth + 1
        return Math.max(...obj.map(item => getObjectDepth(item, currentDepth + 1)))
    }

    let maxDepth = currentDepth
    for (const value of Object.values(obj)) {
        maxDepth = Math.max(maxDepth, getObjectDepth(value, currentDepth + 1))
    }

    return maxDepth
}

/**
 * Normalize data structure into relational tables
 */
function normalizeDataStructure(data: any[], baseFileName: string): NormalizedTable[] {
    const tables: NormalizedTable[] = []

    // Generate base table name from file name
    const baseTableName = generateTableName(baseFileName)

    // Analyze the schema of the first item to understand structure
    const schema = inferSchema(data[0])

    // Create main table
    const mainTable = createMainTable(baseTableName, schema, data)
    tables.push(mainTable)

    // Create child tables for nested objects
    const childTables = createChildTables(baseTableName, schema, data)
    tables.push(...childTables)

    return tables
}

/**
 * Generate table name from file name with intelligent categorization
 */
function generateTableName(fileName: string): string {
    // Remove extension and sanitize
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()

    // Analyze sample data to determine category
    // This is a simplified version - in production you'd analyze the actual data
    const semanticTableName = inferSemanticTableName(baseName)

    return `data_${semanticTableName}`
}

/**
 * Infer semantic table name based on common patterns
 */
function inferSemanticTableName(baseName: string): string {
    const name = baseName.toLowerCase()

    // Check for employee-related fields
    if (name.includes('employee') || name.includes('staff') || name.includes('personnel')) {
        return 'employees'
    }

    // Check for location/geo fields
    if (name.includes('location') || name.includes('address') || name.includes('geo')) {
        return 'locations'
    }

    // Check for product/inventory
    if (name.includes('product') || name.includes('inventory') || name.includes('item')) {
        return 'products'
    }

    // Check for sales/transactions
    if (name.includes('sale') || name.includes('transaction') || name.includes('order')) {
        return 'sales'
    }

    // Default to sanitized base name
    return baseName
}

/**
 * Infer schema from a single object
 */
function inferSchema(obj: any): Record<string, any> {
    const schema: Record<string, any> = {}

    for (const [key, value] of Object.entries(obj)) {
        schema[key] = {
            type: getValueType(value),
            nullable: value === null || value === undefined
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            schema[key].properties = inferSchema(value)
        } else if (Array.isArray(value) && value.length > 0) {
            schema[key].items = {
                type: getValueType(value[0])
            }
            if (typeof value[0] === 'object' && value[0] !== null) {
                schema[key].items.properties = inferSchema(value[0])
            }
        }
    }

    return schema
}

/**
 * Get type of a value
 */
function getValueType(value: any): string {
    if (value === null || value === undefined) return 'null'
    if (Array.isArray(value)) return 'array'
    return typeof value
}

/**
 * Create main table from schema and data
 */
function createMainTable(tableName: string, schema: Record<string, any>, data: any[]): NormalizedTable {
    const columns: ColumnDefinition[] = [
        { name: 'id', type: 'SERIAL', nullable: false, isPrimaryKey: true }
    ]

    // Add columns based on schema
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        if (fieldName === 'id') continue;
        if (fieldSchema.type === 'object') {
            // For nested objects, create foreign key
            const childTableName = `${tableName}_${fieldName}`
            columns.push({
                name: `${fieldName}_ref`,
                type: 'INTEGER',
                nullable: true,
                isForeignKey: true,
                references: childTableName
            })
        } else if (fieldSchema.type === 'array') {
            // Store arrays as JSONB
            columns.push({
                name: fieldName,
                type: 'JSONB',
                nullable: fieldSchema.nullable
            })
        } else {
            columns.push({
                name: fieldName,
                type: mapToSQLType(fieldSchema.type),
                nullable: fieldSchema.nullable
            })
        }
    }

    // Add timestamps
    columns.push(
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false }
    )

    // Transform data for main table
    const tableData = data.map((item, index) => {
        const row: any = {
            id: index + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        for (const [fieldName, fieldSchema] of Object.entries(schema)) {
            if (fieldName === 'id') continue;
            if (fieldSchema.type === 'object') {
                // Will be handled by foreign key relationship
                row[`${fieldName}_ref`] = index + 1 // Temporary, will be updated with actual FK
            } else if (fieldSchema.type === 'array') {
                row[fieldName] = item[fieldName] || []
            } else {
                row[fieldName] = item[fieldName]
            }
        }

        return row
    })

    return {
        name: tableName,
        columns,
        data: tableData
    }
}

/**
 * Create child tables for nested objects
 */
function createChildTables(
    baseTableName: string,
    schema: Record<string, any>,
    data: any[]
): NormalizedTable[] {
    const childTables: NormalizedTable[] = []

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        if (fieldSchema.type === 'object' && fieldSchema.properties) {
            const childTableName = `${baseTableName}_${fieldName}`
            const childTable = createChildTable(childTableName, fieldSchema.properties, data, fieldName, baseTableName)
            childTables.push(childTable)
        }
    }

    return childTables
}

/**
 * Create a child table for a nested object
 */
function createChildTable(
    tableName: string,
    properties: Record<string, any>,
    data: any[],
    parentFieldName: string,
    mainTableName: string
): NormalizedTable {
    const columns: ColumnDefinition[] = [
        { name: 'id', type: 'SERIAL', nullable: false, isPrimaryKey: true },
        { name: 'parent_ref', type: 'INTEGER', nullable: false, isForeignKey: true, references: mainTableName }
    ]

    // Add columns based on properties
    for (const [propName, propSchema] of Object.entries(properties)) {
        if (propName === 'id') continue;
        columns.push({
            name: propName,
            type: mapToSQLType(propSchema.type),
            nullable: propSchema.nullable
        })
    }

    // Add timestamps
    columns.push(
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false }
    )

    // Transform data for child table
    const tableData: any[] = []
    data.forEach((item, parentIndex) => {
        const nestedObj = item[parentFieldName]
        if (nestedObj && typeof nestedObj === 'object') {
            const row: any = {
                id: tableData.length + 1,
                parent_ref: parentIndex + 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            for (const [propName, propSchema] of Object.entries(properties)) {
                if (propName === 'id') continue;
                row[propName] = nestedObj[propName]
            }

            tableData.push(row)
        }
    })

    return {
        name: tableName,
        columns,
        data: tableData
    }
}

/**
 * Map JavaScript types to SQL types
 */
function mapToSQLType(jsType: string): string {
    switch (jsType) {
        case 'string':
            return 'TEXT'
        case 'number':
            return 'NUMERIC'
        case 'boolean':
            return 'BOOLEAN'
        case 'object':
            return 'JSONB'
        case 'array':
            return 'JSONB'
        default:
            return 'TEXT'
    }
}

/**
 * Handle NoSQL storage
 */
async function handleNoSQLStorage(
    supabase: any,
    result: JSONProcessingResult,
    fileId: string,
    fileName: string,
    fileMetadata: any
): Promise<void> {
    console.log(`[EDGE_FUNCTION] Handling NoSQL storage for ${fileId}`)

    // Save schema to json_schemas table
    const schemaData = {
        file_id: fileId,
        schema: {
            type: 'nosql',
            reasoning: result.reasoning
        },
        storage_type: 'NoSQL'
    }

    const { error: schemaError } = await supabase
        .from('json_schemas')
        .upsert(schemaData, { onConflict: 'file_id' })

    if (schemaError) {
        throw new Error(`Failed to save NoSQL schema: ${schemaError.message}`)
    }

    // Update files_metadata
    const { error: updateError } = await supabase
        .from('files_metadata')
        .update({
            storage_type: 'NoSQL',
            record_count: result.recordCount,
            updated_at: new Date().toISOString()
        })
        .eq('id', fileId)

    if (updateError) {
        throw new Error(`Failed to update NoSQL metadata: ${updateError.message}`)
    }

    // Log success
    await logProcessingOperation(supabase, fileId, 'UPDATE_SCHEMA', 'SUCCESS', {
        storageType: 'NoSQL',
        recordCount: result.recordCount
    })
}

/**
 * Handle SQL storage with dynamic table creation
 */
async function handleSQLStorage(
    supabase: any,
    result: JSONProcessingResult,
    fileId: string,
    fileName: string,
    fileMetadata: any
): Promise<void> {
    console.log(`[EDGE_FUNCTION] Handling SQL storage for ${fileId} with ${result.tables.length} tables`)

    const tableNames: string[] = []
    let totalRecords = 0

    // Use transaction for atomicity
    const { error: transactionError } = await supabase.rpc('begin_transaction')

    try {
        for (const table of result.tables) {
            console.log(`[EDGE_FUNCTION] Creating table: ${table.name}`)

            // Create table
            await createTableInSupabase(supabase, table, fileId)

            // Insert data in batches
            const inserted = await insertDataInBatches(supabase, table, fileId)
            totalRecords += inserted

            tableNames.push(table.name)
            console.log(`[EDGE_FUNCTION] Table ${table.name} created with ${inserted} records`)
        }

        // Save schema to json_schemas table
        const schemaData = {
            file_id: fileId,
            schema: {
                type: 'sql',
                tables: tableNames,
                reasoning: result.reasoning
            },
            storage_type: 'SQL'
        }

        const { error: schemaError } = await supabase
            .from('json_schemas')
            .upsert(schemaData, { onConflict: 'file_id' })

        if (schemaError) {
            throw new Error(`Failed to save SQL schema: ${schemaError.message}`)
        }

        // Create schema version
        const versionNumber = await createSchemaVersion(supabase, fileId, schemaData.schema, 'SQL', tableNames[0], totalRecords)

        // Update files_metadata
        const { error: updateError } = await supabase
            .from('files_metadata')
            .update({
                table_name: tableNames[0],
                record_count: totalRecords,
                storage_type: 'SQL',
                schema_id: fileId, // Using file_id as schema_id for simplicity
                updated_at: new Date().toISOString()
            })
            .eq('id', fileId)

        if (updateError) {
            throw new Error(`Failed to update SQL metadata: ${updateError.message}`)
        }

        // Commit transaction
        await supabase.rpc('commit_transaction')

        // Log success
        await logProcessingOperation(supabase, fileId, 'CREATE_TABLE', 'SUCCESS', {
            tableNames,
            recordCount: totalRecords,
            schemaVersion: versionNumber
        })

    } catch (error) {
        // Rollback transaction
        await supabase.rpc('rollback_transaction')
        throw error
    }
}

/**
 * Create a table in Supabase using dynamic DDL
 */
async function createTableInSupabase(supabase: any, table: NormalizedTable, fileId: string): Promise<void> {
    // Generate CREATE TABLE statement
    const createTableSQL = generateCreateTableSQL(table)

    console.log(`[EDGE_FUNCTION] Executing DDL: ${createTableSQL}`)

    // Execute DDL using Supabase's RPC function for dynamic SQL
    const { error } = await supabase.rpc('execute_sql', {
        sql_query: createTableSQL
    })

    if (error) {
        console.error(`[EDGE_FUNCTION] DDL execution failed:`, error)
        throw new Error(`Failed to create table ${table.name}: ${error.message}`)
    }

    // Log table creation
    await logProcessingOperation(supabase, fileId, 'CREATE_TABLE', 'SUCCESS', {
        tableName: table.name,
        sql: createTableSQL
    })
}

/**
 * Generate CREATE TABLE SQL statement
 */
function generateCreateTableSQL(table: NormalizedTable): string {
    const columnsSQL = table.columns.map(col => {
        let colSQL = `"${col.name}" ${col.type}`

        if (!col.nullable) {
            colSQL += ' NOT NULL'
        }

        if (col.isPrimaryKey) {
            colSQL += ' PRIMARY KEY'
        }

        return colSQL
    }).join(', ')

    const foreignKeysSQL = table.columns
        .filter(col => col.isForeignKey && col.references)
        .map(col => `FOREIGN KEY ("${col.name}") REFERENCES "${col.references}"(id)`)
        .join(', ')

    let sql = `CREATE TABLE IF NOT EXISTS "${table.name}" (${columnsSQL}`

    if (foreignKeysSQL) {
        sql += `, ${foreignKeysSQL}`
    }

    sql += ')'

    return sql
}

/**
 * Insert data in batches
 */
async function insertDataInBatches(supabase: any, table: NormalizedTable, fileId: string, batchSize: number = 100): Promise<number> {
    let inserted = 0

    for (let i = 0; i < table.data.length; i += batchSize) {
        const batch = table.data.slice(i, i + batchSize)

        // Generate INSERT statement
        const insertSQL = generateInsertSQL(table.name, batch)

        console.log(`[EDGE_FUNCTION] Inserting batch of ${batch.length} records into ${table.name}`)

        // Execute insert
        const { error } = await supabase.rpc('execute_sql', {
            sql_query: insertSQL
        })

        if (error) {
            console.error(`[EDGE_FUNCTION] Batch insert failed for ${table.name}:`, error)
            throw new Error(`Failed to insert data into ${table.name}: ${error.message}`)
        }

        inserted += batch.length
    }

    // Log data insertion
    await logProcessingOperation(supabase, fileId, 'INSERT_DATA', 'SUCCESS', {
        tableName: table.name,
        recordCount: inserted
    })

    return inserted
}

/**
 * Generate INSERT SQL statement
 */
function generateInsertSQL(tableName: string, data: any[]): string {
    if (data.length === 0) return ''

    const columns = Object.keys(data[0])
    const columnsSQL = columns.map(col => `"${col}"`).join(', ')

    const valuesSQL = data.map(row => {
        const rowValues = columns.map(col => {
            const value = row[col]
            if (value === null || value === undefined) {
                return 'NULL'
            } else if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`
            } else if (typeof value === 'boolean') {
                return value ? 'TRUE' : 'FALSE'
            } else if (Array.isArray(value) || typeof value === 'object') {
                return `'${JSON.stringify(value).replace(/'/g, "''")}'`
            } else {
                return String(value)
            }
        }).join(', ')
        return `(${rowValues})`
    }).join(', ')

    return `INSERT INTO "${tableName}" (${columnsSQL}) VALUES ${valuesSQL}`
}

/**
 * Create schema version
 */
async function createSchemaVersion(
    supabase: any,
    fileId: string,
    schema: any,
    storageType: string,
    tableName: string,
    recordCount: number
): Promise<number> {
    const { data, error } = await supabase.rpc('create_schema_version', {
        p_file_id: fileId,
        p_schema: schema,
        p_storage_type: storageType,
        p_table_name: tableName,
        p_record_count: recordCount,
        p_changes_description: 'Initial schema creation'
    })

    if (error) {
        console.warn(`[EDGE_FUNCTION] Failed to create schema version:`, error)
        return 1 // Default to version 1
    }

    return data
}

/**
 * Log processing operation
 */
async function logProcessingOperation(
    supabase: any,
    fileId: string,
    operationType: string,
    status: string,
    details?: any,
    errorMessage?: string
): Promise<void> {
    try {
        await supabase.rpc('log_data_processing', {
            p_file_id: fileId,
            p_operation_type: operationType,
            p_status: status,
            p_details: details || {},
            p_error_message: errorMessage || null,
            p_processing_time_ms: 0
        })
    } catch (error) {
        console.warn(`[EDGE_FUNCTION] Failed to log operation:`, error)
    }
}
