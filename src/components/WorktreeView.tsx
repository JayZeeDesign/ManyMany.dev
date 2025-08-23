import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Plus, X, GitBranch, FolderOpen, Terminal as TerminalIcon } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { Terminal } from './Terminal';

// Clean modern terminal interface - no global state needed

interface TerminalSession {
  id: string;
  name: string;
  isActive: boolean;
  backendTerminalId?: string; // Backend terminal ID from Tauri
}

export function WorktreeView() {
  const { getSelectedProject, getSelectedWorktree, selectWorktree } = useProjectStore();
  const project = getSelectedProject();
  const worktree = getSelectedWorktree();

  // Helper function to extract worktree name from path
  const getWorktreeName = (worktreePath: string) => {
    const pathParts = worktreePath.split('/');
    return pathParts[pathParts.length - 1] || 'Unnamed';
  };
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);

  // Clean state management without debug logging

  if (!project || !worktree) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No worktree selected</p>
          <p className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
            Select a worktree from your project to view details
          </p>
        </div>
      </div>
    );
  }

  const handleCreateTerminal = async () => {
    if (isCreatingTerminal) return;
    
    const terminalName = `Terminal ${terminals.length + 1}`;
    const frontendId = `terminal-${Date.now()}`;
    
    setIsCreatingTerminal(true);
    
    try {
      const backendTerminalId = await invoke('create_terminal', {
        request: {
          worktree_id: worktree.id,
          name: terminalName,
          working_directory: worktree.path
        }
      }) as string;
      
      // Create frontend terminal session with backend ID
      const newTerminal: TerminalSession = {
        id: frontendId,
        name: terminalName,
        isActive: true,
        backendTerminalId: backendTerminalId
      };
      
      setTerminals([...terminals, newTerminal]);
      setActiveTerminalId(newTerminal.id);
      
    } catch (error) {
      console.error('Failed to create terminal:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to create terminal: ${errorMessage}`);
    } finally {
      setIsCreatingTerminal(false);
    }
  };

  const handleCloseTerminal = async (terminalId: string) => {
    // Find the terminal to close and get its backend ID
    const terminalToClose = terminals.find(t => t.id === terminalId);
    
    if (terminalToClose && terminalToClose.backendTerminalId) {
      try {
        await invoke('close_terminal', { terminalId: terminalToClose.backendTerminalId });
      } catch (error) {
        console.error('Failed to close backend terminal:', error);
        // Continue with frontend cleanup even if backend cleanup fails
      }
    }
    
    // Update frontend state
    setTerminals(terminals.filter(t => t.id !== terminalId));
    if (activeTerminalId === terminalId) {
      const remaining = terminals.filter(t => t.id !== terminalId);
      setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameTerminal = (terminalId: string, newName: string) => {
    setTerminals(terminals.map(t => 
      t.id === terminalId ? { ...t, name: newName } : t
    ));
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectWorktree(null)}
              className="p-1.5 rounded-md transition-all"
              style={{ 
                backgroundColor: 'transparent',
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
              title="Back to project"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" style={{ color: 'rgb(var(--color-primary))' }} />
                <h1 className="text-xl font-semibold">{getWorktreeName(worktree.path)}</h1>
                <span className="text-sm px-2 py-1 rounded" style={{ 
                  backgroundColor: 'rgb(var(--color-muted))',
                  color: 'rgb(var(--color-muted-foreground))'
                }}>
                  {worktree.branch}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <FolderOpen className="w-4 h-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                <p className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                  {worktree.path}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateTerminal}
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary))',
                color: 'rgb(var(--color-primary-foreground))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Plus className="w-4 h-4" />
              {isCreatingTerminal ? 'Creating...' : 'New Terminal'}
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="flex-1 flex flex-col">
        {terminals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <TerminalIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No terminals open</p>
              <p className="text-sm mb-4" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                Create a terminal to start working in this worktree
              </p>
              <button
                onClick={handleCreateTerminal}
                className="px-4 py-2 text-sm font-medium rounded-md transition-all"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary))',
                  color: 'rgb(var(--color-primary-foreground))'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isCreatingTerminal ? 'Creating Terminal...' : 'Create Terminal'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Terminal Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto" 
                 style={{ borderColor: 'rgb(var(--color-border))' }}>
              {terminals.map((terminal) => (
                <div
                  key={terminal.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer transition-all group"
                  style={{ 
                    backgroundColor: activeTerminalId === terminal.id 
                      ? 'rgb(var(--color-background))' 
                      : 'transparent',
                    borderBottom: activeTerminalId === terminal.id 
                      ? '2px solid rgb(var(--color-primary))' 
                      : '2px solid transparent'
                  }}
                  onClick={() => setActiveTerminalId(terminal.id)}
                >
                  <TerminalIcon className="w-3 h-3" />
                  <span 
                    className="text-sm"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleRenameTerminal(terminal.id, e.currentTarget.textContent || terminal.name)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {terminal.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTerminal(terminal.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                    style={{ 
                      backgroundColor: 'transparent',
                      color: 'rgb(var(--color-muted-foreground))'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-destructive))';
                      e.currentTarget.style.color = 'rgb(var(--color-destructive-foreground))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleCreateTerminal}
                className="p-1.5 rounded transition-all ml-2"
                style={{ 
                  backgroundColor: 'transparent',
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
                title="New terminal"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Active Terminal */}
            <div className="flex-1 p-4">
              {terminals.map((terminal) => (
                <div
                  key={terminal.id}
                  style={{ 
                    display: activeTerminalId === terminal.id ? 'block' : 'none',
                    height: '100%'
                  }}
                >
                  <Terminal
                    terminalId={terminal.backendTerminalId}
                    worktreeId={worktree.id}
                    workingDirectory={worktree.path}
                    name={terminal.name}
                    onClose={() => handleCloseTerminal(terminal.id)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}