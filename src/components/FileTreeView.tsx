"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react';
import { FileTreeNode } from '@/lib/utils/buildFileTree';

interface FileTreeViewProps {
    nodes: FileTreeNode[];
    level?: number;
    onFileClick?: (node: FileTreeNode) => void;
    onFolderClick?: (node: FileTreeNode) => void;
    searchQuery?: string;
    highlightedPaths?: Set<string>;
}

interface TreeNodeProps {
    node: FileTreeNode;
    level: number;
    onFileClick?: (node: FileTreeNode) => void;
    onFolderClick?: (node: FileTreeNode) => void;
    onToggle: (node: FileTreeNode) => void;
    highlightedPaths?: Set<string>;
}

function TreeNode({ node, level, onFileClick, onFolderClick, onToggle, highlightedPaths }: TreeNodeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const isHighlighted = highlightedPaths?.has(node.path);

    const handleClick = useCallback(() => {
        if (node.type === 'folder') {
            onToggle(node);
            onFolderClick?.(node);
        } else {
            onFileClick?.(node);
        }
    }, [node, onToggle, onFileClick, onFolderClick]);

    const paddingLeft = level * 16 + 8; // 16px per level, plus 8px base

    return (
        <div>
            <motion.div
                className={`flex items-center py-1 px-2 cursor-pointer select-none hover:bg-accent/50 rounded-sm transition-colors ${isHighlighted
                    ? 'bg-zinc-700 border-l-2 border-teal-500'
                    : isHovered
                        ? 'bg-accent/30'
                        : ''
                    }`}
                style={{ paddingLeft }}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Toggle Icon for Folders */}
                {node.type === 'folder' && (
                    <motion.div
                        initial={false}
                        animate={{ rotate: node.isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="mr-1 flex-shrink-0"
                    >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                )}

                {/* File/Folder Icon */}
                <div className="mr-2 flex-shrink-0">
                    {node.type === 'folder' ? (
                        node.isExpanded ? (
                            <FolderOpen className="h-4 w-4 text-blue-500" />
                        ) : (
                            <Folder className="h-4 w-4 text-blue-500" />
                        )
                    ) : (
                        <File className="h-4 w-4 text-gray-400" />
                    )}
                </div>

                {/* Name */}
                <span className={`text-sm truncate ${node.type === 'folder'
                    ? 'text-blue-400 font-medium'
                    : 'text-gray-300'
                    }`}>
                    {node.name}
                </span>
            </motion.div>

            {/* Children and Files */}
            {node.type === 'folder' && (
                <AnimatePresence>
                    {node.isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {/* Sub-folders */}
                            {node.children && node.children.map((child) => (
                                <TreeNode
                                    key={`${child.path}-${child.name}`}
                                    node={child}
                                    level={level + 1}
                                    onFileClick={onFileClick}
                                    onFolderClick={onFolderClick}
                                    onToggle={onToggle}
                                    highlightedPaths={highlightedPaths}
                                />
                            ))}

                            {/* Files in this folder */}
                            {node.files && node.files.map((fileName) => (
                                <div
                                    key={fileName}
                                    className={`flex items-center py-1 px-2 cursor-pointer select-none hover:bg-accent/50 rounded-sm ml-6`}
                                    onClick={() => {
                                        console.log("open file:", fileName);
                                        // Could add file click handler here
                                    }}
                                >
                                    <File className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-gray-300 hover:underline truncate">
                                        {fileName}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}

export default function FileTreeView({
    nodes,
    level = 0,
    onFileClick,
    onFolderClick,
    highlightedPaths
}: FileTreeViewProps) {
    const [treeNodes, setTreeNodes] = useState(nodes);

    // Update treeNodes when nodes prop changes
    useEffect(() => {
        setTreeNodes(nodes);
    }, [nodes]);

    // Auto-expand branches that contain highlighted files
    useEffect(() => {
        if (highlightedPaths && highlightedPaths.size > 0) {
            setTreeNodes(prevNodes => {
                const expandBranches = (nodes: FileTreeNode[]): FileTreeNode[] => {
                    return nodes.map(node => {
                        let shouldExpand = false;

                        // Check if this node or any descendant is highlighted
                        const checkHighlight = (n: FileTreeNode): boolean => {
                            if (highlightedPaths.has(n.path)) return true;
                            if (n.children) {
                                return n.children.some(checkHighlight);
                            }
                            return false;
                        };

                        shouldExpand = checkHighlight(node);

                        if (node.children) {
                            return {
                                ...node,
                                isExpanded: shouldExpand || node.isExpanded,
                                children: expandBranches(node.children)
                            };
                        }

                        return { ...node, isExpanded: shouldExpand || node.isExpanded };
                    });
                };

                return expandBranches(prevNodes);
            });
        }
    }, [highlightedPaths]);

    const handleToggle = useCallback((node: FileTreeNode) => {
        const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
            return nodes.map(n => {
                if (n.path === node.path && n.name === node.name) {
                    return { ...n, isExpanded: !n.isExpanded };
                }
                if (n.children) {
                    return { ...n, children: updateNode(n.children) };
                }
                return n;
            });
        };

        setTreeNodes(prev => updateNode(prev));
    }, []);

    return (
        <div className="w-full bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium text-foreground">File Explorer</h3>
                <p className="text-xs text-muted-foreground">Browse your uploaded files</p>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
                {treeNodes.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <div className="text-center">
                            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No files uploaded yet</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {treeNodes.map((node) => (
                            <TreeNode
                                key={`${node.path}-${node.name}`}
                                node={node}
                                level={level}
                                onFileClick={onFileClick}
                                onFolderClick={onFolderClick}
                                onToggle={handleToggle}
                                highlightedPaths={highlightedPaths}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
