export interface FileTreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: FileTreeNode[];
    files?: string[];
    isExpanded?: boolean;
}

export interface FileTree {
    [key: string]: FileTreeNode;
}

interface FileInfo {
    folder_path: string;
    name: string;
}

/**
 * Builds a nested file tree structure from an array of file objects
 * @param files Array of file objects with folder_path and name
 * @returns Nested tree structure
 */
export function buildFileTree(files: FileInfo[]): FileTreeNode[] {
    const root: FileTreeNode[] = [];

    // Sort files to ensure consistent ordering
    const sortedFiles = [...files].sort((a, b) => {
        const pathA = `${a.folder_path}/${a.name}`;
        const pathB = `${b.folder_path}/${b.name}`;
        return pathA.localeCompare(pathB);
    });

    for (const file of sortedFiles) {
        const folderParts = file.folder_path.split('/').filter(part => part.length > 0);
        const fullPath = `${file.folder_path}/${file.name}`;
        insertPathWithFile(root, folderParts, file.name, fullPath);
    }

    return root;
}

/**
 * Recursively inserts a path with file into the tree structure
 */
function insertPathWithFile(nodes: FileTreeNode[], folderParts: string[], fileName: string, fullPath: string): void {
    if (folderParts.length === 0) {
        // Add file to root level
        const fileNode = nodes.find(n => n.name === fileName && n.type === 'file');
        if (!fileNode) {
            nodes.push({
                name: fileName,
                path: fullPath,
                type: 'file',
                isExpanded: false,
            });
        }
        return;
    }

    const [currentPart, ...remainingParts] = folderParts;

    // Find existing folder or create new one
    let folderNode = nodes.find(n => n.name === currentPart && n.type === 'folder');

    if (!folderNode) {
        folderNode = {
            name: currentPart,
            path: fullPath.replace(`/${fileName}`, ''), // folder path
            type: 'folder',
            children: [],
            files: [],
            isExpanded: false,
        };
        nodes.push(folderNode);
    }

    // If this is the last folder part, add the file to this folder
    if (remainingParts.length === 0) {
        if (!folderNode.files) folderNode.files = [];
        if (!folderNode.files.includes(fileName)) {
            folderNode.files.push(fileName);
        }
        return;
    }

    // Continue with remaining parts
    if (!folderNode.children) folderNode.children = [];
    insertPathWithFile(folderNode.children, remainingParts, fileName, fullPath);
}

/**
 * Recursively inserts a path into the tree structure
 */
function insertPath(nodes: FileTreeNode[], parts: string[], fullPath: string): void {
    if (parts.length === 0) return;

    const [currentPart, ...remainingParts] = parts;
    const isFile = remainingParts.length === 0;

    // Find existing node or create new one
    let node = nodes.find(n => n.name === currentPart);

    if (!node) {
        node = {
            name: currentPart,
            path: fullPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            isExpanded: false, // Default collapsed
        };
        nodes.push(node);
    }

    // If it's a file, we're done
    if (isFile) {
        node.type = 'file';
        node.children = undefined;
        return;
    }

    // If it's a folder, continue with remaining parts
    if (!node.children) {
        node.children = [];
    }

    insertPath(node.children, remainingParts, fullPath);
}

/**
 * Sorts tree nodes: folders first, then files, alphabetically
 */
export function sortTreeNodes(nodes: FileTreeNode[]): FileTreeNode[] {
    return nodes.sort((a, b) => {
        // Folders come before files
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;

        // Alphabetical within same type
        return a.name.localeCompare(b.name);
    }).map(node => {
        if (node.children) {
            node.children = sortTreeNodes(node.children);
        }
        if (node.files) {
            node.files = node.files.sort((a, b) => a.localeCompare(b));
        }
        return node;
    });
}

/**
 * Flattens the tree structure back to file paths for verification
 */
export function flattenTree(nodes: FileTreeNode[]): string[] {
    const paths: string[] = [];

    function traverse(node: FileTreeNode, currentPath: string = '') {
        const newPath = currentPath ? `${currentPath}/${node.name}` : node.name;

        if (node.type === 'file') {
            paths.push(newPath);
        } else if (node.children) {
            for (const child of node.children) {
                traverse(child, newPath);
            }
        }
    }

    for (const node of nodes) {
        traverse(node);
    }

    return paths;
}

/**
 * Counts total files and folders in the tree
 */
export function countTreeItems(nodes: FileTreeNode[]): { files: number; folders: number } {
    let files = 0;
    let folders = 0;

    function traverse(node: FileTreeNode) {
        if (node.type === 'file') {
            files++;
        } else {
            folders++;
            if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        }
    }

    for (const node of nodes) {
        traverse(node);
    }

    return { files, folders };
}
