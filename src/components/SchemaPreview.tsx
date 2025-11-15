import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, FileText, AlertTriangle } from 'lucide-react';
import { JSONAnalysisResult } from '@/utils/jsonAnalyzer';

interface SchemaPreviewProps {
    analysis: JSONAnalysisResult;
    fileName?: string;
}

interface SQLSchema {
    tableName: string;
    columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        primaryKey?: boolean;
        foreignKey?: {
            table: string;
            column: string;
        };
    }>;
    constraints: string[];
}

interface NoSQLSchema {
    collectionName: string;
    documentStructure: Record<string, any>;
    indexes: string[];
    estimatedSize: string;
}

export default function SchemaPreview({ analysis, fileName }: SchemaPreviewProps) {
    const generateSQLSchema = (): SQLSchema => {
        const tableName = fileName ? fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'generated_table';

        const columns = analysis.uniqueFields.map(field => {
            const types = analysis.dataTypes[field] || ['string'];
            const primaryType = types[0];

            let sqlType = 'VARCHAR(255)';
            switch (primaryType) {
                case 'number':
                    sqlType = 'DECIMAL(10,2)';
                    break;
                case 'boolean':
                    sqlType = 'BOOLEAN';
                    break;
                case 'array':
                    sqlType = 'JSON';
                    break;
                case 'object':
                    sqlType = 'JSON';
                    break;
            }

            // Guess primary key
            const isPrimaryKey = field.toLowerCase().includes('id') ||
                field.toLowerCase().includes('key') ||
                field === analysis.uniqueFields[0];

            // Guess foreign keys
            let foreignKey;
            if (field.toLowerCase().includes('user_id') || field.toLowerCase().includes('userid')) {
                foreignKey = { table: 'users', column: 'id' };
            } else if (field.toLowerCase().includes('category_id')) {
                foreignKey = { table: 'categories', column: 'id' };
            }

            return {
                name: field,
                type: sqlType,
                nullable: !analysis.commonFields.includes(field),
                primaryKey: isPrimaryKey,
                foreignKey
            };
        });

        const constraints = [];
        const pkColumns = columns.filter(col => col.primaryKey);
        if (pkColumns.length > 0) {
            constraints.push(`PRIMARY KEY (${pkColumns.map(col => col.name).join(', ')})`);
        }

        columns.forEach(col => {
            if (col.foreignKey) {
                constraints.push(`FOREIGN KEY (${col.name}) REFERENCES ${col.foreignKey.table}(${col.foreignKey.column})`);
            }
        });

        return { tableName, columns, constraints };
    };

    const generateNoSQLSchema = (): NoSQLSchema => {
        const collectionName = fileName ? fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'documents';

        const documentStructure: Record<string, any> = {};
        analysis.uniqueFields.forEach(field => {
            const types = analysis.dataTypes[field] || ['string'];
            const primaryType = types[0];

            let exampleValue: any;
            switch (primaryType) {
                case 'string':
                    exampleValue = 'sample_text';
                    break;
                case 'number':
                    exampleValue = 42;
                    break;
                case 'boolean':
                    exampleValue = true;
                    break;
                case 'array':
                    exampleValue = ['item1', 'item2'];
                    break;
                case 'object':
                    exampleValue = { nestedField: 'value' };
                    break;
                default:
                    exampleValue = null;
            }

            documentStructure[field] = exampleValue;
        });

        const indexes = [];
        if (analysis.uniqueFields.some(f => f.toLowerCase().includes('id'))) {
            indexes.push('{ "id": 1 }');
        }
        if (analysis.uniqueFields.some(f => f.toLowerCase().includes('created'))) {
            indexes.push('{ "created_at": 1 }');
        }

        const estimatedSize = analysis.estimatedRecordCount > 0
            ? `${(JSON.stringify(documentStructure).length * analysis.estimatedRecordCount / 1024).toFixed(1)} KB`
            : 'Variable';

        return { collectionName, documentStructure, indexes, estimatedSize };
    };

    if (analysis.storageRecommendation === 'SQL') {
        const schema = generateSQLSchema();
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                        <Database className="w-5 h-5" />
                        Proposed SQL Schema
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="font-mono text-sm bg-gray-50 p-3 rounded">
                        <div className="text-blue-600 font-semibold">CREATE TABLE {schema.tableName} (</div>
                        {schema.columns.map((col, idx) => (
                            <div key={col.name} className="ml-4">
                                {col.name} {col.type}
                                {col.primaryKey && <span className="text-purple-600"> PRIMARY KEY</span>}
                                {col.nullable ? ' NULL' : ' NOT NULL'}
                                {idx < schema.columns.length - 1 ? ',' : ''}
                            </div>
                        ))}
                        {schema.constraints.length > 0 && (
                            <>
                                {schema.columns.length > 0 && ','}
                                {schema.constraints.map((constraint, idx) => (
                                    <div key={idx} className="ml-4 text-orange-600">
                                        {constraint}{idx < schema.constraints.length - 1 ? ',' : ''}
                                    </div>
                                ))}
                            </>
                        )}
                        <div className="text-blue-600 font-semibold">);</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium">Fields:</span> {schema.columns.length}
                        </div>
                        <div>
                            <span className="font-medium">Primary Keys:</span> {schema.columns.filter(c => c.primaryKey).length}
                        </div>
                        <div>
                            <span className="font-medium">Foreign Keys:</span> {schema.columns.filter(c => c.foreignKey).length}
                        </div>
                        <div>
                            <span className="font-medium">Records:</span> {analysis.estimatedRecordCount}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (analysis.storageRecommendation === 'NoSQL') {
        const schema = generateNoSQLSchema();
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600">
                        <FileText className="w-5 h-5" />
                        Proposed NoSQL Document Model
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="font-medium mb-2">Collection: <code className="bg-gray-100 px-2 py-1 rounded">{schema.collectionName}</code></div>
                        <div className="font-mono text-sm bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                            {JSON.stringify(schema.documentStructure, null, 2)}
                        </div>
                    </div>

                    {schema.indexes.length > 0 && (
                        <div>
                            <div className="font-medium mb-2">Recommended Indexes:</div>
                            <div className="space-y-1">
                                {schema.indexes.map((index, idx) => (
                                    <code key={idx} className="block bg-gray-100 px-2 py-1 rounded text-sm">
                                        {index}
                                    </code>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium">Fields:</span> {Object.keys(schema.documentStructure).length}
                        </div>
                        <div>
                            <span className="font-medium">Est. Size:</span> {schema.estimatedSize}
                        </div>
                        <div>
                            <span className="font-medium">Documents:</span> {analysis.estimatedRecordCount}
                        </div>
                        <div>
                            <span className="font-medium">Nested:</span> {analysis.hasNestedObjects ? 'Yes' : 'No'}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Uncertain case
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="w-5 h-5" />
                    Schema Analysis
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-gray-600">
                    <p>This JSON structure is irregular or contains mixed data types.</p>
                    <p className="mt-2">Consider:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Normalizing the data structure</li>
                        <li>Using a flexible document store</li>
                        <li>Storing as raw JSON/text</li>
                    </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                        <span className="font-medium">Structure:</span> {analysis.structureType}
                    </div>
                    <div>
                        <span className="font-medium">Fields:</span> {analysis.uniqueFields.length}
                    </div>
                    <div>
                        <span className="font-medium">Consistency:</span> {(analysis.fieldConsistency * 100).toFixed(0)}%
                    </div>
                    <div>
                        <span className="font-medium">Records:</span> {analysis.estimatedRecordCount}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
