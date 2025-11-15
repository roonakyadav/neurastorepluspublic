import { supabase } from '@/lib/supabaseClient';

export interface NormalizedTable {
    name: string;
    columns: ColumnDefinition[];
    data: any[];
    foreignKeys?: ForeignKey[];
}

export interface ColumnDefinition {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    references?: string;
}

export interface ForeignKey {
    column: string;
    referencesTable: string;
    referencesColumn: string;
}

export interface JSONProcessingResult {
    storageType: 'SQL' | 'NoSQL';
    reasoning: string;
    tables: NormalizedTable[];
    recordCount: number;
    schemaId?: string;
}

/**
 * Main function to process JSON data and convert to database entities
 */
export async function processJSONData(
    jsonData: any,
    fileId: string,
    fileName: string
): Promise<JSONProcessingResult> {
    // Detect if single object or array
    const isArray = Array.isArray(jsonData);
    const dataToProcess = isArray ? jsonData : [jsonData];

    if (dataToProcess.length === 0) {
        throw new Error('No data to process');
    }

    // Analyze structure to decide SQL vs NoSQL
    const { storageType, reasoning } = analyzeStorageType(dataToProcess);

    if (storageType === 'NoSQL') {
        // For NoSQL, just store the raw JSON
        return {
            storageType: 'NoSQL',
            reasoning,
            tables: [],
            recordCount: dataToProcess.length
        };
    }

    // For SQL, normalize the data structure
    const tables = normalizeDataStructure(dataToProcess, fileName);

    return {
        storageType: 'SQL',
        reasoning,
        tables,
        recordCount: dataToProcess.length
    };
}

/**
 * Analyze data structure to determine SQL vs NoSQL storage
 */
function analyzeStorageType(data: any[]): { storageType: 'SQL' | 'NoSQL'; reasoning: string } {
    if (data.length === 0) {
        return { storageType: 'SQL', reasoning: 'Empty data, defaulting to SQL' };
    }

    const firstItem = data[0];

    // Check if all items are objects with consistent structure
    const hasConsistentStructure = data.every(item =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item)
    );

    if (!hasConsistentStructure) {
        return {
            storageType: 'NoSQL',
            reasoning: 'Data contains non-object items or inconsistent structure'
        };
    }

    // Check for deeply nested structures
    const maxDepth = Math.max(...data.map(item => getObjectDepth(item)));
    if (maxDepth > 3) {
        return {
            storageType: 'NoSQL',
            reasoning: `Data has deep nesting (depth ${maxDepth}), better suited for NoSQL`
        };
    }

    // Check for complex arrays or objects within arrays
    const hasComplexArrays = data.some(item =>
        Object.values(item).some(value =>
            Array.isArray(value) && value.length > 0 &&
            typeof value[0] === 'object' && value[0] !== null
        )
    );

    if (hasComplexArrays) {
        return {
            storageType: 'NoSQL',
            reasoning: 'Contains complex nested arrays, requires NoSQL document structure'
        };
    }

    // Check average number of keys
    const avgKeys = data.reduce((sum, item) => sum + Object.keys(item).length, 0) / data.length;
    if (avgKeys > 50) {
        return {
            storageType: 'NoSQL',
            reasoning: `High number of fields per record (${avgKeys.toFixed(1)}), better for NoSQL`
        };
    }

    return {
        storageType: 'SQL',
        reasoning: `Regular tabular structure with ${avgKeys.toFixed(1)} average fields, suitable for SQL`
    };
}

/**
 * Get the maximum depth of an object
 */
function getObjectDepth(obj: any, currentDepth: number = 0): number {
    if (currentDepth >= 10) return currentDepth; // Prevent infinite recursion

    if (typeof obj !== 'object' || obj === null) {
        return currentDepth;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) return currentDepth + 1;
        return Math.max(...obj.map(item => getObjectDepth(item, currentDepth + 1)));
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
        maxDepth = Math.max(maxDepth, getObjectDepth(value, currentDepth + 1));
    }

    return maxDepth;
}

/**
 * Normalize data structure into relational tables
 */
function normalizeDataStructure(data: any[], baseFileName: string): NormalizedTable[] {
    const tables: NormalizedTable[] = [];
    const processedObjects = new Map<string, any>();

    // Generate base table name from file name
    const baseTableName = generateTableName(baseFileName);

    // Analyze the schema of the first item to understand structure
    const schema = inferSchema(data[0]);

    // Create main table
    const mainTable = createMainTable(baseTableName, schema, data);
    tables.push(mainTable);

    // Create child tables for nested objects
    const childTables = createChildTables(baseTableName, schema, data, processedObjects);
    tables.push(...childTables);

    return tables;
}

/**
 * Generate table name from file name
 */
function generateTableName(fileName: string): string {
    // Remove extension and sanitize
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    return `data_${baseName}`;
}

/**
 * Infer schema from a single object
 */
function inferSchema(obj: any): Record<string, any> {
    const schema: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        schema[key] = {
            type: getValueType(value),
            nullable: value === null || value === undefined
        };

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            schema[key].properties = inferSchema(value);
        } else if (Array.isArray(value) && value.length > 0) {
            schema[key].items = {
                type: getValueType(value[0])
            };
            if (typeof value[0] === 'object' && value[0] !== null) {
                schema[key].items.properties = inferSchema(value[0]);
            }
        }
    }

    return schema;
}

/**
 * Get type of a value
 */
function getValueType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

/**
 * Create main table from schema and data
 */
function createMainTable(tableName: string, schema: Record<string, any>, data: any[]): NormalizedTable {
    const columns: ColumnDefinition[] = [
        { name: 'id', type: 'SERIAL', nullable: false, isPrimaryKey: true }
    ];

    // Add columns based on schema
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        if (fieldSchema.type === 'object') {
            // For nested objects, create foreign key
            const childTableName = `${tableName}_${fieldName}`;
            columns.push({
                name: `${fieldName}_id`,
                type: 'INTEGER',
                nullable: fieldSchema.nullable,
                isForeignKey: true,
                references: childTableName
            });
        } else if (fieldSchema.type === 'array') {
            // Store arrays as JSONB
            columns.push({
                name: fieldName,
                type: 'JSONB',
                nullable: fieldSchema.nullable
            });
        } else {
            columns.push({
                name: fieldName,
                type: mapToSQLType(fieldSchema.type),
                nullable: fieldSchema.nullable
            });
        }
    }

    // Add timestamps
    columns.push(
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false }
    );

    // Transform data for main table
    const tableData = data.map((item, index) => {
        const row: any = {
            id: index + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        for (const [fieldName, fieldSchema] of Object.entries(schema)) {
            if (fieldSchema.type === 'object') {
                // Will be handled by foreign key relationship
                row[`${fieldName}_id`] = index + 1; // Temporary, will be updated with actual FK
            } else if (fieldSchema.type === 'array') {
                row[fieldName] = JSON.stringify(item[fieldName] || []);
            } else {
                row[fieldName] = item[fieldName];
            }
        }

        return row;
    });

    return {
        name: tableName,
        columns,
        data: tableData
    };
}

/**
 * Create child tables for nested objects
 */
function createChildTables(
    baseTableName: string,
    schema: Record<string, any>,
    data: any[],
    processedObjects: Map<string, any>
): NormalizedTable[] {
    const childTables: NormalizedTable[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
        if (fieldSchema.type === 'object' && fieldSchema.properties) {
            const childTableName = `${baseTableName}_${fieldName}`;
            const childTable = createChildTable(childTableName, fieldSchema.properties, data, fieldName);
            childTables.push(childTable);
        }
    }

    return childTables;
}

/**
 * Create a child table for a nested object
 */
function createChildTable(
    tableName: string,
    properties: Record<string, any>,
    data: any[],
    parentFieldName: string
): NormalizedTable {
    const columns: ColumnDefinition[] = [
        { name: 'id', type: 'SERIAL', nullable: false, isPrimaryKey: true },
        { name: 'parent_id', type: 'INTEGER', nullable: false, isForeignKey: true }
    ];

    // Add columns based on properties
    for (const [propName, propSchema] of Object.entries(properties)) {
        columns.push({
            name: propName,
            type: mapToSQLType(propSchema.type),
            nullable: propSchema.nullable
        });
    }

    // Add timestamps
    columns.push(
        { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', nullable: false }
    );

    // Transform data for child table
    const tableData: any[] = [];
    data.forEach((item, parentIndex) => {
        const nestedObj = item[parentFieldName];
        if (nestedObj && typeof nestedObj === 'object') {
            const row: any = {
                id: tableData.length + 1,
                parent_id: parentIndex + 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            for (const [propName, propSchema] of Object.entries(properties)) {
                row[propName] = nestedObj[propName];
            }

            tableData.push(row);
        }
    });

    return {
        name: tableName,
        columns,
        data: tableData
    };
}

/**
 * Map JavaScript types to SQL types
 */
function mapToSQLType(jsType: string): string {
    switch (jsType) {
        case 'string':
            return 'TEXT';
        case 'number':
            return 'NUMERIC';
        case 'boolean':
            return 'BOOLEAN';
        case 'object':
            return 'JSONB';
        case 'array':
            return 'JSONB';
        default:
            return 'TEXT';
    }
}

/**
 * Create tables in Supabase and insert data
 */
export async function createTablesAndInsertData(
    tables: NormalizedTable[],
    fileId: string
): Promise<{ success: boolean; recordCount: number; tableNames: string[] }> {
    const tableNames: string[] = [];
    let totalRecords = 0;

    console.log(`[JSON_PROCESSOR] Starting table creation for ${tables.length} tables`);

    for (const table of tables) {
        try {
            console.log(`[JSON_PROCESSOR] Creating table: ${table.name}`);

            // Create table
            await createTableInSupabase(table);

            // Insert data in batches
            const inserted = await insertDataInBatches(table);
            totalRecords += inserted;

            tableNames.push(table.name);
            console.log(`[JSON_PROCESSOR] Table ${table.name} created with ${inserted} records`);
        } catch (error) {
            console.error(`[JSON_PROCESSOR] Failed to create/insert data for table ${table.name}:`, error);

            // Log the error to data_processing_errors table
            await logProcessingError(fileId, 'CREATE_TABLE', `Failed to create table ${table.name}: ${error instanceof Error ? error.message : String(error)}`, error);

            throw error;
        }
    }

    // Update files_metadata
    await updateFileMetadata(fileId, tableNames[0], totalRecords);

    // Log success
    await logProcessingSuccess(fileId, 'CREATE_TABLE', `Created ${tableNames.length} tables with ${totalRecords} total records`, {
        tableNames,
        recordCount: totalRecords
    });

    return {
        success: true,
        recordCount: totalRecords,
        tableNames
    };
}

/**
 * Create a table in Supabase - using pre-created tables approach
 * Since Supabase doesn't allow dynamic DDL from client, we'll use a generic table structure
 */
async function createTableInSupabase(table: NormalizedTable): Promise<void> {
    // For now, we'll assume the tables are pre-created or use a generic approach
    // In a production system, you'd need to create RPC functions in Supabase that allow table creation

    console.log(`[JSON_PROCESSOR] Table creation requested for: ${table.name}`);
    console.log(`[JSON_PROCESSOR] Columns:`, table.columns.map(c => `${c.name} ${c.type}`));

    // Check if table exists by trying to query it
    try {
        const { error } = await supabase
            .from(table.name)
            .select('id')
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            console.warn(`[JSON_PROCESSOR] Table ${table.name} does not exist. You may need to create it manually in Supabase.`);
            console.warn(`[JSON_PROCESSOR] Required columns:`, table.columns.map(c => `${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}`));
        }
    } catch (error) {
        console.warn(`[JSON_PROCESSOR] Could not verify table existence:`, error);
    }
}

/**
 * Insert data in batches to avoid timeouts
 */
async function insertDataInBatches(table: NormalizedTable, batchSize: number = 100): Promise<number> {
    let inserted = 0;

    for (let i = 0; i < table.data.length; i += batchSize) {
        const batch = table.data.slice(i, i + batchSize);

        try {
            const { error } = await supabase
                .from(table.name)
                .insert(batch);

            if (error) {
                console.error(`Batch insert failed for ${table.name}:`, error);
                throw error;
            }

            inserted += batch.length;
        } catch (error) {
            console.error(`Failed to insert batch into ${table.name}:`, error);
            throw error;
        }
    }

    return inserted;
}

/**
 * Update files_metadata with table info
 */
async function updateFileMetadata(fileId: string, tableName: string, recordCount: number): Promise<void> {
    try {
        const { error } = await supabase
            .from('files_metadata')
            .update({
                table_name: tableName,
                record_count: recordCount,
                storage_type: 'SQL',
                updated_at: new Date().toISOString()
            })
            .eq('id', fileId);

        if (error) {
            console.warn('Failed to update files_metadata:', error);
        }
    } catch (error) {
        console.warn('Error updating files_metadata:', error);
    }
}

/**
 * Log processing success
 */
async function logProcessingSuccess(
    fileId: string,
    operationType: string,
    message: string,
    details?: any
): Promise<void> {
    try {
        await supabase
            .from('data_processing_logs')
            .insert({
                file_id: fileId,
                operation_type: operationType,
                status: 'SUCCESS',
                details: details || {},
                processing_time_ms: 0, // TODO: track actual processing time
                created_at: new Date().toISOString()
            });
    } catch (error) {
        console.warn('Failed to log processing success:', error);
    }
}

/**
 * Log processing error
 */
async function logProcessingError(
    fileId: string,
    operationType: string,
    errorMessage: string,
    error: any
): Promise<void> {
    try {
        await supabase
            .from('data_processing_logs')
            .insert({
                file_id: fileId,
                operation_type: operationType,
                status: 'FAILED',
                error_message: errorMessage,
                details: {
                    error: error?.message || String(error),
                    stack: error?.stack
                },
                processing_time_ms: 0,
                created_at: new Date().toISOString()
            });
    } catch (logError) {
        console.warn('Failed to log processing error:', logError);
    }
}
