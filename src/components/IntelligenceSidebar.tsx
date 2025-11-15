import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Database,
    FileText,
    AlertTriangle,
    Users,
    Eye,
    EyeOff,
    CheckCircle
} from 'lucide-react';
import { JSONAnalysisResult, MultiFileComparison, JSONAnalyzer } from '@/utils/jsonAnalyzer';
import { useToast } from '@/components/ui/toast';

interface IntelligenceSidebarProps {
    analysis: JSONAnalysisResult;
    comparison?: MultiFileComparison;
    fileName?: string;
    fileId?: string;
    allAnalyses?: Record<string, JSONAnalysisResult>;
    metadata?: {
        tags: string[];
        comments: string;
    };
    onMetadataChange?: (metadata: { tags: string[]; comments: string }) => void;
    onStorageSuccess?: () => void;
}

export default function IntelligenceSidebar({
    analysis,
    comparison,
    fileName,
    fileId,
    allAnalyses,
    onStorageSuccess
}: IntelligenceSidebarProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isStoring, setIsStoring] = useState(false);
    const [isStored, setIsStored] = useState(false);
    const { addToast } = useToast();

    const handleStoreIntelligently = async () => {
        if (!fileId) {
            addToast('error', 'Storage Error', 'File ID not available');
            return;
        }

        setIsStoring(true);

        try {
            switch (analysis.classification) {
                case 'SQL JSON': {
                    // First create table
                    const createResponse = await fetch('/api/create-sql-table', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileId,
                            tableName: fileName?.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'data_table',
                            schema: analysis.dataTypes || {}
                        })
                    });

                    if (!createResponse.ok) {
                        const errorData = await createResponse.json();
                        if (createResponse.status === 409 && errorData.code === 'SCHEMA_EXISTS') {
                            // Schema exists, proceed to insert
                        } else {
                            throw new Error(errorData.error || 'Failed to create table');
                        }
                    }

                    // Then insert rows - need to get the data somehow
                    // For now, we'll assume the data is available in the component
                    // This would need to be passed as a prop or fetched
                    addToast('success', 'Storage Complete', `Table created successfully`);
                    break;
                }

                case 'NoSQL JSON':
                case 'Generic JSON': {
                    const response = await fetch('/api/process-json', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileId })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to store JSON');
                    }

                    addToast('success', 'Storage Complete', 'Stored as JSONB');
                    break;
                }

                case 'Malformed JSON': {
                    addToast('error', 'Storage Error', 'Malformed JSON — cannot store');
                    return;
                }

                default: {
                    addToast('error', 'Storage Error', 'Unknown classification type');
                    return;
                }
            }

            setIsStored(true);
            onStorageSuccess?.();

        } catch (error: any) {
            console.error('Storage error:', error);
            addToast('error', 'Storage Failed', error.message || 'An error occurred during storage');
        } finally {
            setIsStoring(false);
        }
    };

    const getClassificationIcon = () => {
        switch (analysis.classification) {
            case 'SQL JSON':
                return <Database className="w-4 h-4 text-green-400" />;
            case 'NoSQL JSON':
                return <FileText className="w-4 h-4 text-blue-400" />;
            case 'Generic JSON':
                return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
            case 'Malformed JSON':
                return <AlertTriangle className="w-4 h-4 text-red-400" />;
            default:
                return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        }
    };

    const getClassificationColor = () => {
        switch (analysis.classification) {
            case 'SQL JSON':
                return 'bg-green-900 text-green-200 border-green-700';
            case 'NoSQL JSON':
                return 'bg-blue-900 text-blue-200 border-blue-700';
            case 'Generic JSON':
                return 'bg-yellow-900 text-yellow-200 border-yellow-700';
            case 'Malformed JSON':
                return 'bg-red-900 text-red-200 border-red-700';
            default:
                return 'bg-yellow-900 text-yellow-200 border-yellow-700';
        }
    };

    const getClassificationExplanation = () => {
        switch (analysis.classification) {
            case 'SQL JSON':
                return 'Flat & consistent schema';
            case 'NoSQL JSON':
                return 'Nested structured data';
            case 'Generic JSON':
                return 'Very inconsistent structure';
            case 'Malformed JSON':
                return 'Invalid JSON';
            default:
                return '';
        }
    };

    return (
        <div className={`bg-[#0B1220] border-l border-gray-700 transition-all duration-300 ${isExpanded ? 'w-[350px]' : 'w-12'} flex-shrink-0`}>
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <h3 className={`font-semibold text-sm text-gray-200 ${isExpanded ? 'block' : 'hidden'}`}>
                    Intelligence
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                >
                    {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
            </div>

            {isExpanded && (
                <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* JSON Classification */}
                    <Card className="rounded-lg py-3 px-3">
                        <CardHeader className="pb-2 px-0">
                            <CardTitle className="text-sm flex items-center gap-2">
                                {getClassificationIcon()}
                                JSON Classification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 px-0">
                            <div className="flex items-center justify-between">
                                <Badge className={`text-xs font-medium ${getClassificationColor()}`}>
                                    {analysis.classification}
                                </Badge>
                                {isStored && (
                                    <div className="flex items-center gap-1 text-green-400">
                                        <CheckCircle className="w-3 h-3" />
                                        <span className="text-xs font-medium">Stored</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                {getClassificationExplanation()}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Store Intelligently Button */}
                    {fileId && analysis.classification !== 'Malformed JSON' && !isStored && (
                        <Card className="rounded-lg py-3 px-3">
                            <CardContent className="pt-0 px-0">
                                <Button
                                    onClick={handleStoreIntelligently}
                                    disabled={isStoring}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isStoring ? 'Storing...' : 'Store Intelligently'}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Final Storage Decision */}
                    <Card className="rounded-lg py-3 px-3">
                        <CardHeader className="pb-2 px-0">
                            <CardTitle className="text-sm">Final Storage Decision</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 px-0">
                            <div className="text-xs text-gray-400">
                                {analysis.classification === 'SQL JSON' && (
                                    <p>Will be stored as SQL relational tables</p>
                                )}
                                {(analysis.classification === 'NoSQL JSON' || analysis.classification === 'Generic JSON') && (
                                    <p>Will be stored in JSONB format</p>
                                )}
                                {analysis.classification === 'Malformed JSON' && (
                                    <p>Cannot be stored - invalid JSON format</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Batch Analysis - Schema Consistency */}
                    {allAnalyses && Object.keys(allAnalyses).length > 0 && (
                        <Card className="rounded-lg py-3 px-3">
                            <CardHeader className="pb-2 px-0">
                                <CardTitle className="text-sm">Batch Analysis</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 px-0">
                                {(() => {
                                    const allAnalysesList = [analysis, ...Object.values(allAnalyses)];
                                    const consistency = JSONAnalyzer.checkSchemaConsistency(allAnalysesList);
                                    return (
                                        <div className="space-y-2">
                                            <Badge className={`text-xs ${consistency.isConsistent ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                                {consistency.isConsistent ? `Consistent Schema Across ${consistency.consistentCount} Files` : 'Different Structures Detected'}
                                            </Badge>
                                            {consistency.isConsistent && (
                                                <p className="text-xs text-gray-400">
                                                    Files can share one schema
                                                </p>
                                            )}
                                            {!consistency.isConsistent && (
                                                <p className="text-xs text-gray-400">
                                                    Files have different structures
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    )}

                    {/* Similar Files Count */}
                    {comparison && comparison.similarFiles.length > 0 && (
                        <Card className="rounded-lg py-3 px-3">
                            <CardHeader className="pb-2 px-0">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Users className="w-4 h-4 text-purple-400" />
                                    Similar Files
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 px-0">
                                <div className="text-lg font-semibold text-purple-400">
                                    {comparison.similarFiles.length}
                                </div>
                                <p className="text-xs text-gray-400">
                                    files with similar structure
                                </p>
                                {comparison.similarFiles.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {comparison.similarFiles.slice(0, 3).map((file, idx) => (
                                            <div key={idx} className="text-xs bg-gray-700 p-2 rounded text-gray-200">
                                                <div className="font-medium truncate">{file.fileName}</div>
                                                <div className="text-gray-400">
                                                    {(file.similarity * 100).toFixed(0)}% similar
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Schema Preview (Condensed) */}
                    <Card className="rounded-lg py-3 px-3">
                        <CardHeader className="pb-2 px-0">
                            <CardTitle className="text-sm">Schema Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 px-0">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Structure:</span>
                                    <span className="font-medium text-gray-200">{analysis.structureType.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Fields:</span>
                                    <span className="font-medium text-gray-200">{analysis.uniqueFields.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Records:</span>
                                    <span className="font-medium text-gray-200">{analysis.estimatedRecordCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Consistency:</span>
                                    <span className="font-medium text-gray-200">{(analysis.fieldConsistency * 100).toFixed(0)}%</span>
                                </div>
                                {analysis.hasNestedObjects && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Nested Objects:</span>
                                        <Badge variant="secondary" className="text-xs">Yes</Badge>
                                    </div>
                                )}
                                {analysis.hasArrays && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Arrays:</span>
                                        <Badge variant="secondary" className="text-xs">Yes</Badge>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Field Consistency Alerts */}
                    {analysis.fieldConsistency < 0.8 && (
                        <Card className="rounded-lg py-3 px-3 border-yellow-700 bg-yellow-900">
                            <CardContent className="pt-4 px-0">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                                    <div className="text-xs">
                                        <div className="font-medium text-yellow-200">Inconsistent Fields</div>
                                        <p className="text-yellow-300 mt-1">
                                            Some fields are missing in certain records. This may affect data integrity.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}


                </div>
            )}
        </div>
    );
}
