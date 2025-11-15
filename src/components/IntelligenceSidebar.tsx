import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Database,
    FileText,
    AlertTriangle,
    Users,
    Tag,
    Plus,
    X,
    Eye,
    EyeOff
} from 'lucide-react';
import { JSONAnalysisResult, MultiFileComparison } from '@/utils/jsonAnalyzer';

interface IntelligenceSidebarProps {
    analysis: JSONAnalysisResult;
    comparison?: MultiFileComparison;
    fileName?: string;
    metadata?: {
        tags: string[];
        comments: string;
    };
    onMetadataChange?: (metadata: { tags: string[]; comments: string }) => void;
}

export default function IntelligenceSidebar({
    analysis,
    comparison,
    fileName,
    metadata = { tags: [], comments: '' },
    onMetadataChange
}: IntelligenceSidebarProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [newTag, setNewTag] = useState('');
    const [comments, setComments] = useState(metadata.comments);
    const [tags, setTags] = useState<string[]>(metadata.tags);

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            const updatedTags = [...tags, newTag.trim()];
            setTags(updatedTags);
            setNewTag('');
            onMetadataChange?.({ tags: updatedTags, comments });
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const updatedTags = tags.filter(tag => tag !== tagToRemove);
        setTags(updatedTags);
        onMetadataChange?.({ tags: updatedTags, comments });
    };

    const handleCommentsChange = (newComments: string) => {
        setComments(newComments);
        onMetadataChange?.({ tags, comments: newComments });
    };

    const getRecommendationIcon = () => {
        switch (analysis.storageRecommendation) {
            case 'SQL':
                return <Database className="w-4 h-4 text-green-400" />;
            case 'NoSQL':
                return <FileText className="w-4 h-4 text-blue-400" />;
            default:
                return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        }
    };

    const getRecommendationColor = () => {
        switch (analysis.storageRecommendation) {
            case 'SQL':
                return 'bg-green-900 text-green-200 border-green-700';
            case 'NoSQL':
                return 'bg-blue-900 text-blue-200 border-blue-700';
            default:
                return 'bg-yellow-900 text-yellow-200 border-yellow-700';
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
                    {/* Storage Recommendation */}
                    <Card className="rounded-lg py-3 px-3">
                        <CardHeader className="pb-2 px-0">
                            <CardTitle className="text-sm flex items-center gap-2">
                                {getRecommendationIcon()}
                                Storage Recommendation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 px-0">
                            <Badge className={`text-xs font-medium ${getRecommendationColor()}`}>
                                {analysis.storageRecommendation}
                            </Badge>
                            <div className="mt-2 text-xs text-gray-400">
                                {analysis.storageRecommendation === 'SQL' && (
                                    <p>Well-structured data with consistent fields. Perfect for relational databases.</p>
                                )}
                                {analysis.storageRecommendation === 'NoSQL' && (
                                    <p>Flexible structure with nested objects or arrays. Ideal for document databases.</p>
                                )}
                                {analysis.storageRecommendation === 'Uncertain' && (
                                    <p>Mixed or irregular structure. Consider data normalization or flexible storage.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

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

                    {/* Metadata Enhancement */}
                    <Card className="rounded-lg py-3 px-3">
                        <CardHeader className="pb-2 px-0">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Tag className="w-4 h-4 text-indigo-400" />
                                Metadata
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 px-0 space-y-3">
                            {/* Tags */}
                            <div>
                                <Label className="text-xs font-medium text-gray-200">Tags</Label>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {tags.map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                                            {tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 hover:bg-gray-600 rounded-full p-0.5"
                                            >
                                                <X className="w-2 h-2" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-1 mt-2">
                                    <Input
                                        placeholder="Add tag..."
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddTag()}
                                        className="text-xs h-7"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleAddTag}
                                        className="h-7 px-2"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Comments */}
                            <div>
                                <Label className="text-xs font-medium text-gray-200">Comments</Label>
                                <Textarea
                                    placeholder="Add notes about this file..."
                                    value={comments}
                                    onChange={(e) => handleCommentsChange(e.target.value)}
                                    className="text-xs mt-1 min-h-[60px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
