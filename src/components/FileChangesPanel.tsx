import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, FileText, ExternalLink, List, Network } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { TreeView } from '@/components/TreeView';
import { buildFileTree } from '@/utils/fileTree';

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFile[];
  unstaged: GitFile[];
  untracked: GitFile[];
}

interface GitFile {
  path: string;
  status: string;
}

export function FileChangesPanel() {
  const { showFileChangesPanel, setShowFileChangesPanel, getSelectedWorktree } = useProjectStore();
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');
  
  const selectedWorktree = getSelectedWorktree();

  // Live polling for git status
  useEffect(() => {
    if (!showFileChangesPanel || !selectedWorktree) {
      setIsLoading(false);
      return;
    }

    const fetchGitStatus = async () => {
      try {
        setError(null);
        const status = await invoke('get_git_status', { 
          worktreePath: selectedWorktree.path 
        }) as GitStatus;
        setGitStatus(status);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch git status:', error);
        setError(error instanceof Error ? error.message : String(error));
        setIsLoading(false);
      }
    };

    fetchGitStatus(); // Load immediately
    
    // Poll for changes every 2 seconds while panel is open
    const interval = setInterval(fetchGitStatus, 2000);
    
    return () => clearInterval(interval);
  }, [showFileChangesPanel, selectedWorktree]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'rgb(34 197 94)'; // green
      case 'modified':
        return 'rgb(234 179 8)'; // yellow
      case 'deleted':
        return 'rgb(239 68 68)'; // red
      case 'renamed':
        return 'rgb(168 85 247)'; // purple
      case 'untracked':
        return 'rgb(156 163 175)'; // gray
      default:
        return 'rgb(156 163 175)'; // gray
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'added':
        return 'A';
      case 'modified':
        return 'M';
      case 'deleted':
        return 'D';
      case 'renamed':
        return 'R';
      case 'untracked':
        return 'U';
      default:
        return '?';
    }
  };

  const handleOpenFile = async (filePath: string) => {
    if (!selectedWorktree) return;
    
    try {
      const fullPath = `${selectedWorktree.path}/${filePath}`;
      await invoke('open_in_app', { path: fullPath, app: 'cursor' });
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const FileList = ({ files }: { files: GitFile[] }) => {
    if (files.length === 0) return null;
    
    return (
      <div>
        {files.map((file, index) => {
          const fileName = file.path.split('/').pop() || file.path;
          const directory = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';
          
          return (
            <div 
              key={`${file.path}-${index}`}
              className="flex items-center px-2 py-1 cursor-pointer transition-colors group relative"
              style={{ 
                minHeight: '24px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted) / 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => handleOpenFile(file.path)}
            >
              {/* Status indicator */}
              <div 
                className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: getStatusColor(file.status) }}
              />
              
              {/* File info */}
              <div className="flex-1 min-w-0 flex items-center">
                <span 
                  className="text-sm truncate mr-2" 
                  style={{ color: 'rgb(var(--color-foreground))' }}
                  title={file.path}
                >
                  {fileName}
                </span>
                
                {directory && (
                  <span 
                    className="text-xs truncate opacity-60" 
                    style={{ color: 'rgb(var(--color-muted-foreground))' }}
                    title={directory}
                  >
                    {directory}
                  </span>
                )}
              </div>

              {/* Status label */}
              <span 
                className="text-xs font-mono mr-2 flex-shrink-0"
                style={{ 
                  color: getStatusColor(file.status),
                  minWidth: '12px',
                  textAlign: 'center'
                }}
              >
                {getStatusLabel(file.status)}
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
                  handleOpenFile(file.path);
                }}
                title="Open file"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  if (!showFileChangesPanel) return null;

  return (
    <div 
      className="w-80 flex flex-col border-l flex-shrink-0"
      style={{ 
        backgroundColor: 'rgb(var(--color-background))',
        borderColor: 'rgb(var(--color-border))'
      }}
    >
        {/* Header - match terminal tab height (h-9) */}
        <div 
          className="h-9 flex items-center justify-between px-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium" style={{ color: 'rgb(var(--color-foreground))' }}>
              FILE CHANGES
            </h3>
            <button
              onClick={() => setViewMode(viewMode === 'flat' ? 'tree' : 'flat')}
              className="p-1 rounded transition-colors"
              style={{ color: 'rgb(var(--color-muted-foreground))' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                e.currentTarget.style.color = 'rgb(var(--color-foreground))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
              }}
              title={viewMode === 'flat' ? 'Switch to tree view' : 'Switch to flat view'}
            >
              {viewMode === 'flat' ? <Network className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setShowFileChangesPanel(false)}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgb(var(--color-muted-foreground))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                Loading file changes...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm" style={{ color: 'rgb(var(--color-destructive))' }}>
                Error: {error}
              </div>
            </div>
          ) : !selectedWorktree ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                No worktree selected
              </div>
            </div>
          ) : !gitStatus ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                No git status available
              </div>
            </div>
          ) : (
            <>
              {/* Branch info */}
              <div className="mb-4 mx-3 p-3 rounded-md" style={{ backgroundColor: 'rgb(var(--color-card))' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-foreground))' }}>
                    Branch: {gitStatus.branch}
                  </span>
                </div>
                {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                    {gitStatus.ahead > 0 && <span>↑{gitStatus.ahead}</span>}
                    {gitStatus.behind > 0 && <span>↓{gitStatus.behind}</span>}
                  </div>
                )}
              </div>

              {/* Files display - conditional based on view mode */}
              {viewMode === 'flat' ? (
                <FileList files={[...gitStatus.staged, ...gitStatus.unstaged, ...gitStatus.untracked]} />
              ) : (
                <TreeView 
                  nodes={buildFileTree([...gitStatus.staged, ...gitStatus.unstaged, ...gitStatus.untracked])}
                  onFileClick={handleOpenFile}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                />
              )}

              {/* Empty state */}
              {gitStatus.staged.length === 0 && gitStatus.unstaged.length === 0 && gitStatus.untracked.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <FileText className="w-12 h-12 mb-4 opacity-50" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                  <div className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                    No changes detected
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}