// Schema comparison utilities for SQL JSON storage

// Map JSON schema types to PostgreSQL types (same as in create-sql-table)
function mapJsonTypeToPostgres(jsonType: string): string {
    switch (jsonType.toLowerCase()) {
        case 'string':
            return 'TEXT';
        case 'number':
            return 'NUMERIC';
        case 'boolean':
            return 'BOOLEAN';
        case 'null':
            return 'TEXT'; // fallback for null values
        default:
            return 'TEXT'; // fallback for unknown types
    }
}

// Compare two schemas and return detailed differences
export function compareSchemas(
    existingSchema: Record<string, string>,
    newSchema: Record<string, string>
): {
    isExactMatch: boolean;
    missingColumns: string[];
    extraColumns: string[];
    mismatchedTypes: Array<{ column: string; existingType: string; newType: string }>;
} {
    const existingKeys = Object.keys(existingSchema);
    const newKeys = Object.keys(newSchema);

    // Find missing columns (in existing but not in new)
    const missingColumns = existingKeys.filter(key => !newKeys.includes(key));

    // Find extra columns (in new but not in existing)
    const extraColumns = newKeys.filter(key => !existingKeys.includes(key));

    // Find mismatched types (same key but different types)
    const mismatchedTypes: Array<{ column: string; existingType: string; newType: string }> = [];
    for (const key of existingKeys) {
        if (newKeys.includes(key)) {
            const existingType = mapJsonTypeToPostgres(existingSchema[key]);
            const newType = mapJsonTypeToPostgres(newSchema[key]);
            if (existingType !== newType) {
                mismatchedTypes.push({
                    column: key,
                    existingType,
                    newType
                });
            }
        }
    }

    const isExactMatch = missingColumns.length === 0 &&
        extraColumns.length === 0 &&
        mismatchedTypes.length === 0;

    return {
        isExactMatch,
        missingColumns,
        extraColumns,
        mismatchedTypes
    };
}

// Check if schema conflict exists (returns false if exact match, true if conflict)
export function hasSchemaConflict(
    existingSchema: Record<string, string>,
    newSchema: Record<string, string>
): boolean {
    const comparison = compareSchemas(existingSchema, newSchema);
    return !comparison.isExactMatch;
}
