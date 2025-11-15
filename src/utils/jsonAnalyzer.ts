export interface JSONAnalysisResult {
    structureType: 'flat' | 'nested' | 'array_of_objects' | 'key_value' | 'irregular';
    isSQLFriendly: boolean;
    isNoSQLDocument: boolean;
    isGeneric: boolean;
    classification: 'SQL JSON' | 'NoSQL JSON' | 'Generic JSON' | 'Malformed JSON';
    fieldConsistency: number; // 0-1, how consistent fields are
    hasNestedObjects: boolean;
    hasArrays: boolean;
    estimatedRecordCount: number;
    uniqueFields: string[];
    commonFields: string[];
    dataTypes: Record<string, string[]>;
}

export interface MultiFileComparison {
    similarFiles: Array<{
        fileName: string;
        similarity: number;
        sharedFields: string[];
        uniqueFields: string[];
    }>;
    fieldComparison: Record<string, {
        presentIn: string[];
        types: string[];
        consistency: number;
    }>;
}

export class JSONAnalyzer {
    static analyzeStructure(jsonData: any): JSONAnalysisResult {
        const result: JSONAnalysisResult = {
            structureType: 'irregular',
            isSQLFriendly: false,
            isNoSQLDocument: false,
            isGeneric: false,
            classification: 'Malformed JSON',
            fieldConsistency: 0,
            hasNestedObjects: false,
            hasArrays: false,
            estimatedRecordCount: 0,
            uniqueFields: [],
            commonFields: [],
            dataTypes: {}
        };

        if (!jsonData || typeof jsonData !== 'object') {
            result.isGeneric = true;
            result.classification = 'Malformed JSON';
            return result;
        }

        // Determine structure type
        if (Array.isArray(jsonData)) {
            result.estimatedRecordCount = jsonData.length;
            if (jsonData.length === 0) {
                result.structureType = 'array_of_objects';
                result.isGeneric = true;
            } else {
                const firstItem = jsonData[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                    result.structureType = 'array_of_objects';
                    this.analyzeArrayOfObjects(jsonData, result);
                } else {
                    result.structureType = 'irregular';
                    result.isGeneric = true;
                }
            }
        } else {
            // Single object
            if (this.isFlatObject(jsonData)) {
                result.structureType = 'flat';
                this.analyzeFlatObject(jsonData, result);
            } else {
                result.structureType = 'nested';
                this.analyzeNestedObject(jsonData, result);
            }
        }

        // Determine classification
        this.determineClassification(result);

        return result;
    }

    private static analyzeArrayOfObjects(array: any[], result: JSONAnalysisResult): void {
        const allFields = new Set<string>();
        const fieldPresence: Record<string, number> = {};
        const fieldTypes: Record<string, Set<string>> = {};

        array.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => {
                    allFields.add(key);
                    fieldPresence[key] = (fieldPresence[key] || 0) + 1;

                    const value = item[key];
                    const type = this.getValueType(value);
                    if (!fieldTypes[key]) fieldTypes[key] = new Set();
                    fieldTypes[key].add(type);

                    if (typeof value === 'object' && value !== null) {
                        if (Array.isArray(value)) {
                            result.hasArrays = true;
                        } else {
                            result.hasNestedObjects = true;
                        }
                    }
                });
            }
        });

        result.uniqueFields = Array.from(allFields);
        result.commonFields = Object.entries(fieldPresence)
            .filter(([, count]) => count === array.length)
            .map(([field]) => field);

        result.fieldConsistency = result.commonFields.length / allFields.size;

        result.dataTypes = {};
        Object.entries(fieldTypes).forEach(([field, types]) => {
            result.dataTypes[field] = Array.from(types);
        });

        // SQL-friendly if high consistency and mostly primitive types
        const primitiveTypes = ['string', 'number', 'boolean'];
        const hasComplexTypes = Object.values(fieldTypes).some(types =>
            Array.from(types).some(type => !primitiveTypes.includes(type))
        );

        result.isSQLFriendly = result.fieldConsistency > 0.8 && !hasComplexTypes;
        result.isNoSQLDocument = result.fieldConsistency > 0.5 || result.hasNestedObjects || result.hasArrays;
    }

    private static analyzeFlatObject(obj: any, result: JSONAnalysisResult): void {
        result.uniqueFields = Object.keys(obj);
        result.commonFields = result.uniqueFields; // All fields are present
        result.fieldConsistency = 1;

        result.dataTypes = {};
        Object.entries(obj).forEach(([key, value]) => {
            result.dataTypes[key] = [this.getValueType(value)];
            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    result.hasArrays = true;
                } else {
                    result.hasNestedObjects = true;
                }
            }
        });

        result.isSQLFriendly = !result.hasNestedObjects && !result.hasArrays;
        result.isNoSQLDocument = result.hasNestedObjects || result.hasArrays;
    }

    private static analyzeNestedObject(obj: any, result: JSONAnalysisResult): void {
        const fields = new Set<string>();
        this.collectFields(obj, fields, '');
        result.uniqueFields = Array.from(fields);
        result.commonFields = result.uniqueFields; // All fields are present in single object
        result.fieldConsistency = 1;

        result.hasNestedObjects = true;
        result.isNoSQLDocument = true;
        result.isSQLFriendly = false;
    }

    private static collectFields(obj: any, fields: Set<string>, prefix: string): void {
        if (typeof obj !== 'object' || obj === null) return;

        Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            fields.add(fullKey);

            if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.collectFields(obj[key], fields, fullKey);
            }
        });
    }

    private static isFlatObject(obj: any): boolean {
        if (typeof obj !== 'object' || obj === null) return false;

        for (const value of Object.values(obj)) {
            if (typeof value === 'object' && value !== null) {
                return false;
            }
        }
        return true;
    }

    private static getValueType(value: any): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    private static determineClassification(result: JSONAnalysisResult): void {
        if (result.isSQLFriendly) {
            result.classification = 'SQL JSON';
        } else if (result.isNoSQLDocument) {
            result.classification = 'NoSQL JSON';
        } else {
            result.classification = 'Generic JSON';
        }
    }

    static compareWithOtherFiles(currentAnalysis: JSONAnalysisResult, otherAnalyses: Record<string, JSONAnalysisResult>): MultiFileComparison {
        const comparison: MultiFileComparison = {
            similarFiles: [],
            fieldComparison: {}
        };

        // Build field comparison
        const allFields = new Set([...currentAnalysis.uniqueFields]);
        Object.values(otherAnalyses).forEach(analysis => {
            analysis.uniqueFields.forEach(field => allFields.add(field));
        });

        Array.from(allFields).forEach(field => {
            comparison.fieldComparison[field] = {
                presentIn: [],
                types: [],
                consistency: 0
            };

            // Check current file
            if (currentAnalysis.uniqueFields.includes(field)) {
                comparison.fieldComparison[field].presentIn.push('current');
                const types = currentAnalysis.dataTypes[field];
                if (types) comparison.fieldComparison[field].types.push(...types);
            }

            // Check other files
            Object.entries(otherAnalyses).forEach(([fileName, analysis]) => {
                if (analysis.uniqueFields.includes(field)) {
                    comparison.fieldComparison[field].presentIn.push(fileName);
                    const types = analysis.dataTypes[field];
                    if (types) comparison.fieldComparison[field].types.push(...types);
                }
            });

            // Calculate consistency
            const totalFiles = Object.keys(otherAnalyses).length + 1;
            comparison.fieldComparison[field].consistency =
                comparison.fieldComparison[field].presentIn.length / totalFiles;
        });

        // Find similar files
        Object.entries(otherAnalyses).forEach(([fileName, analysis]) => {
            const sharedFields = currentAnalysis.uniqueFields.filter(field =>
                analysis.uniqueFields.includes(field)
            );

            const similarity = sharedFields.length /
                Math.max(currentAnalysis.uniqueFields.length, analysis.uniqueFields.length);

            if (similarity > 0.3) { // 30% similarity threshold
                comparison.similarFiles.push({
                    fileName,
                    similarity,
                    sharedFields,
                    uniqueFields: analysis.uniqueFields.filter(field =>
                        !currentAnalysis.uniqueFields.includes(field)
                    )
                });
            }
        });

        // Sort by similarity
        comparison.similarFiles.sort((a, b) => b.similarity - a.similarity);

        return comparison;
    }

    static checkSchemaConsistency(analyses: JSONAnalysisResult[]): { isConsistent: boolean; consistentCount: number; totalFiles: number } {
        if (analyses.length <= 1) {
            return { isConsistent: true, consistentCount: analyses.length, totalFiles: analyses.length };
        }

        // Check if all files have the same classification
        const classifications = analyses.map(a => a.classification);
        const uniqueClassifications = new Set(classifications);

        // If all have the same classification and it's not Malformed, check field consistency
        if (uniqueClassifications.size === 1 && !classifications.includes('Malformed JSON')) {
            // For array-based JSON, check if fields are similar
            const arrayAnalyses = analyses.filter(a => a.structureType === 'array_of_objects');
            if (arrayAnalyses.length === analyses.length) {
                // Calculate average field consistency
                const avgConsistency = arrayAnalyses.reduce((sum, a) => sum + a.fieldConsistency, 0) / arrayAnalyses.length;
                const isConsistent = avgConsistency > 0.7; // 70% consistency threshold
                return { isConsistent, consistentCount: isConsistent ? analyses.length : 0, totalFiles: analyses.length };
            }
            // For other types, consider them consistent if same classification
            return { isConsistent: true, consistentCount: analyses.length, totalFiles: analyses.length };
        }

        // If different classifications or includes malformed, not consistent
        return { isConsistent: false, consistentCount: 0, totalFiles: analyses.length };
    }
}
