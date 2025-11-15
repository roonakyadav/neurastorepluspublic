"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, ExternalLink } from 'lucide-react';

interface DataQueryModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    fileName: string;
}

interface TableMetadata {
    name: string;
    file_name: string;
    record_count: number;
    storage_type: string;
    uploaded_at: string;
    columns: string[];
}

interface QueryResult {
    success: boolean;
    data?: any[];
    count?: number;
    columns?: string[];
    error?: string;
}

export default function DataQueryModal({ isOpen, onClose, tableName, fileName }: DataQueryModalProps) {
    const [metadata, setMetadata] = useState<TableMetadata | null>(null);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [querying, setQuerying] = useState(false);

    // Query parameters
    const [limit, setLimit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [orderBy, setOrderBy] = useState('id');
    const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
    const [filters, setFilters] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen && tableName) {
            loadTableMetadata();
        }
    }, [isOpen, tableName]);

    const loadTableMetadata = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/query-table?table=${encodeURIComponent(tableName)}`);
            const result = await response.json();

            if (result.success) {
                setMetadata(result.table);
                // Set default order by to first column
                if (result.table.columns.length > 0) {
                    setOrderBy(result.table.columns[0]);
                }
            } else {
                console.error('Failed to load table metadata:', result.error);
            }
        } catch (error) {
            console.error('Error loading table metadata:', error);
        } finally {
            setLoading(false);
        }
    };

    const executeQuery = async () => {
        if (!tableName) return;

        setQuerying(true);
        try {
            const response = await fetch('/api/query-table', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    table_name: tableName,
                    limit,
                    offset,
                    order_by: orderBy,
                    order_direction: orderDirection,
                    filters: Object.fromEntries(
                        Object.entries(filters).filter(([_, value]) => value.trim() !== '')
                    )
                }),
            });

            const result = await response.json();
            setQueryResult(result);
        } catch (error) {
            console.error('Error executing query:', error);
            setQueryResult({
                success: false,
                error: 'Failed to execute query'
            });
        } finally {
            setQuerying(false);
        }
    };

    const updateFilter = (column: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const openInSupabase = () => {
        // This would open the Supabase SQL Editor with the table
        // For now, we'll just show an alert
        alert(`Table: ${tableName}\n\nTo query this table in Supabase SQL Editor, use:\nSELECT * FROM ${tableName} LIMIT 100;`);
    };

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading table information...</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Query Data: {fileName}
                    </DialogTitle>
                </DialogHeader>

                {metadata && (
                    <div className="space-y-6">
                        {/* Table Info */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-600">Table:</span>
                                    <div className="font-mono text-gray-900">{metadata.name}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Records:</span>
                                    <div className="text-gray-900">{metadata.record_count.toLocaleString()}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Storage:</span>
                                    <Badge variant={metadata.storage_type === 'SQL' ? 'default' : 'secondary'}>
                                        {metadata.storage_type}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Uploaded:</span>
                                    <div className="text-gray-900">
                                        {new Date(metadata.uploaded_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Query Controls */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Query Controls</h3>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Limit</label>
                                    <Input
                                        type="number"
                                        value={limit}
                                        onChange={(e) => setLimit(Number(e.target.value))}
                                        min={1}
                                        max={1000}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Offset</label>
                                    <Input
                                        type="number"
                                        value={offset}
                                        onChange={(e) => setOffset(Number(e.target.value))}
                                        min={0}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Order By</label>
                                    <Select value={orderBy} onValueChange={setOrderBy}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {metadata.columns.map(col => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Direction</label>
                                    <Select value={orderDirection} onValueChange={(value: 'asc' | 'desc') => setOrderDirection(value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="asc">Ascending</SelectItem>
                                            <SelectItem value="desc">Descending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Filters */}
                            {metadata.columns.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Filters</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        {metadata.columns.slice(0, 6).map(col => (
                                            <Input
                                                key={col}
                                                placeholder={`Filter ${col}...`}
                                                value={filters[col] || ''}
                                                onChange={(e) => updateFilter(col, e.target.value)}
                                                className="text-sm"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button onClick={executeQuery} disabled={querying}>
                                    {querying ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Querying...
                                        </>
                                    ) : (
                                        'Execute Query'
                                    )}
                                </Button>

                                <Button variant="outline" onClick={openInSupabase}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in Supabase
                                </Button>
                            </div>
                        </div>

                        {/* Results */}
                        {queryResult && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Results</h3>
                                    {queryResult.success && queryResult.count !== undefined && (
                                        <Badge variant="outline">
                                            {queryResult.count} rows
                                        </Badge>
                                    )}
                                </div>

                                {queryResult.success ? (
                                    queryResult.data && queryResult.data.length > 0 ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {queryResult.columns?.map(col => (
                                                            <TableHead key={col} className="font-medium">
                                                                {col}
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {queryResult.data.map((row, index) => (
                                                        <TableRow key={index}>
                                                            {queryResult.columns?.map(col => (
                                                                <TableCell key={col} className="max-w-xs truncate">
                                                                    {typeof row[col] === 'object'
                                                                        ? JSON.stringify(row[col])
                                                                        : String(row[col] || '')
                                                                    }
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No data found matching your query.
                                        </div>
                                    )
                                ) : (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-red-800">Query failed: {queryResult.error}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
