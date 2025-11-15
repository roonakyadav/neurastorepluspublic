'use client'

import { File, Image, Video, Music, Database, FileText, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JSONAnalysisResult } from '@/utils/jsonAnalyzer'

interface FileCardProps {
    name: string
    size: number
    type: string
    url?: string
    analysis?: JSONAnalysisResult
    onVisualize?: () => void
}

export default function FileCard({ name, size, type, url, analysis, onVisualize }: FileCardProps) {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getIcon = () => {
        if (type.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />
        if (type.startsWith('video/')) return <Video className="w-8 h-8 text-red-500" />
        if (type.startsWith('audio/')) return <Music className="w-8 h-8 text-green-500" />
        return <File className="w-8 h-8 text-gray-500" />
    }

    const getRecommendationIcon = () => {
        if (!analysis) return null;
        switch (analysis.storageRecommendation) {
            case 'SQL':
                return <Database className="w-3 h-3" />;
            case 'NoSQL':
                return <FileText className="w-3 h-3" />;
            default:
                return <AlertTriangle className="w-3 h-3" />;
        }
    };

    const getRecommendationColor = () => {
        if (!analysis) return '';
        switch (analysis.storageRecommendation) {
            case 'SQL':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'NoSQL':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                            {url && (type.startsWith('image/') || type.startsWith('video/')) ? (
                                type.startsWith('image/') ? (
                                    <img src={url} alt={name} className="w-full h-full object-cover rounded" />
                                ) : (
                                    <video src={url} className="w-full h-full object-cover rounded" />
                                )
                            ) : (
                                getIcon()
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm truncate max-w-full break-words">{name}</h4>
                                {analysis && (
                                    <Badge className={`text-xs flex items-center gap-1 ${getRecommendationColor()}`}>
                                        {getRecommendationIcon()}
                                        {analysis.storageRecommendation}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{type} • {formatSize(size)}</p>
                            {analysis && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400">
                                        {analysis.estimatedRecordCount} records • {(analysis.fieldConsistency * 100).toFixed(0)}% consistent
                                    </span>
                                    {onVisualize && (
                                        <button
                                            onClick={onVisualize}
                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                                        >
                                            Visualize
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
