interface GitFile {
  path: string;
  status: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  status?: string;
  children?: TreeNode[];
  gitFile?: GitFile;
  fileCount?: number; // Number of files in this folder
}

export function buildFileTree(files: GitFile[]): TreeNode[] {
  const root: Record<string, TreeNode> = {};

  files.forEach(file => {
    const pathParts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    pathParts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === pathParts.length - 1;

      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : {},
          gitFile: isFile ? file : undefined,
          status: isFile ? file.status : undefined,
          fileCount: 0
        } as TreeNode & { children?: Record<string, TreeNode> };
      }

      // Update file count for folders
      if (!isFile && currentLevel[part].type === 'folder') {
        currentLevel[part].fileCount = (currentLevel[part].fileCount || 0) + 1;
      }

      if (!isFile) {
        currentLevel = currentLevel[part].children as Record<string, TreeNode>;
      }
    });
  });

  // Convert to array and sort
  function convertToArray(nodes: Record<string, TreeNode>): TreeNode[] {
    const result = Object.values(nodes).map(node => {
      if (node.type === 'folder' && node.children) {
        return {
          ...node,
          children: convertToArray(node.children as Record<string, TreeNode>)
        };
      }
      return node;
    });

    // Sort: folders first, then files. Within each group, sort alphabetically
    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  return convertToArray(root);
}