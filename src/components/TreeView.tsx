import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText, ExternalLink } from 'lucide-react';
import { TreeNode } from '@/utils/fileTree';

interface TreeViewProps {
  nodes: TreeNode[];
  onFileClick: (filePath: string) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

interface TreeItemProps extends TreeViewProps {
  node: TreeNode;
  level: number;
}

function TreeItem({ node, level, nodes, onFileClick, getStatusColor, getStatusLabel }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const paddingLeft = level * 16; // 16px per level

  if (node.type === 'file') {
    return (
      <div
        className="flex items-center px-2 py-1 cursor-pointer transition-colors group relative"
        style={{ 
          paddingLeft: `${paddingLeft + 8}px`,
          minHeight: '24px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted) / 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => onFileClick(node.path)}
      >
        {/* Status indicator */}
        <div 
          className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
          style={{ backgroundColor: getStatusColor(node.status || '') }}
        />
        
        {/* File icon */}
        <FileText className="w-4 h-4 mr-2 flex-shrink-0 opacity-60" 
          style={{ color: 'rgb(var(--color-muted-foreground))' }} 
        />
        
        {/* File name */}
        <span 
          className="text-sm truncate flex-1" 
          style={{ color: 'rgb(var(--color-foreground))' }}
          title={node.path}
        >
          {node.name}
        </span>

        {/* Status label */}
        <span 
          className="text-xs font-mono mr-2 flex-shrink-0"
          style={{ 
            color: getStatusColor(node.status || ''),
            minWidth: '12px',
            textAlign: 'center'
          }}
        >
          {getStatusLabel(node.status || '')}
        </span>

        {/* Open button on hover */}
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded flex-shrink-0"
          style={{ 
            color: 'rgb(var(--color-muted-foreground))'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
            e.currentTarget.style.color = 'rgb(var(--color-foreground))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
          }}
          onClick={(e) => {
            e.stopPropagation();
            onFileClick(node.path);
          }}
          title="Open file"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Folder rendering
  return (
    <>
      <div
        className="flex items-center px-2 py-1 cursor-pointer transition-colors group relative"
        style={{ 
          paddingLeft: `${paddingLeft}px`,
          minHeight: '24px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted) / 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse icon */}
        <div className="w-4 h-4 mr-1 flex items-center justify-center flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
          ) : (
            <ChevronRight className="w-3 h-3" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
          )}
        </div>
        
        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0" 
            style={{ color: 'rgb(var(--color-muted-foreground))' }} 
          />
        ) : (
          <Folder className="w-4 h-4 mr-2 flex-shrink-0" 
            style={{ color: 'rgb(var(--color-muted-foreground))' }} 
          />
        )}
        
        {/* Folder name */}
        <span 
          className="text-sm font-medium flex-1" 
          style={{ color: 'rgb(var(--color-foreground))' }}
          title={node.path}
        >
          {node.name}
        </span>

        {/* File count badge */}
        {node.fileCount && node.fileCount > 0 && (
          <span 
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ 
              backgroundColor: 'rgb(var(--color-muted))',
              color: 'rgb(var(--color-muted-foreground))'
            }}
          >
            {node.fileCount}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child, index) => (
            <TreeItem
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              nodes={nodes}
              onFileClick={onFileClick}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function TreeView({ nodes, onFileClick, getStatusColor, getStatusLabel }: TreeViewProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
          No files to display
        </div>
      </div>
    );
  }

  return (
    <div>
      {nodes.map((node, index) => (
        <TreeItem
          key={`${node.path}-${index}`}
          node={node}
          level={0}
          nodes={nodes}
          onFileClick={onFileClick}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      ))}
    </div>
  );
}