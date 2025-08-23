import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, X, Terminal as TerminalIcon } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { Terminal } from './Terminal';

// Clean modern terminal interface - no global state needed

interface TerminalSession {
  id: string;
  name: string;
  isActive: boolean;
  backendTerminalId?: string; // Backend terminal ID from Tauri
  workingDirectory: string; // Store the working directory path
}

export function WorktreeView() {
  const { getSelectedProject, getSelectedWorktree } = useProjectStore();
  const project = getSelectedProject();
  const worktree = getSelectedWorktree();

  // Store terminal sessions per worktree ID
  const [terminalsByWorktree, setTerminalsByWorktree] = useState<Record<string, {
    terminals: TerminalSession[];
    activeTerminalId: string | null;
  }>>({});
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);

  // Get current worktree's terminals
  const currentWorktreeTerminals = worktree ? terminalsByWorktree[worktree.id] : null;
  const terminals = currentWorktreeTerminals?.terminals || [];
  const activeTerminalId = currentWorktreeTerminals?.activeTerminalId || null;

  // Listen for create terminal events from header
  useEffect(() => {
    const handleCreateTerminal = () => {
      if (worktree) {
        handleCreateTerminalInternal();
      }
    };

    document.addEventListener('createTerminal', handleCreateTerminal);
    return () => document.removeEventListener('createTerminal', handleCreateTerminal);
  }, [worktree]);

  // Clean state management without debug logging

  if (!project || !worktree) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <TerminalIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No worktree selected</p>
          <p className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
            Select a worktree from your project to view details
          </p>
        </div>
      </div>
    );
  }

  const handleCreateTerminalInternal = async () => {
    if (isCreatingTerminal || !worktree) return;
    
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
        backendTerminalId: backendTerminalId,
        workingDirectory: worktree.path
      };
      
      // Update terminals for current worktree
      setTerminalsByWorktree(prev => ({
        ...prev,
        [worktree.id]: {
          terminals: [...terminals, newTerminal],
          activeTerminalId: newTerminal.id
        }
      }));
      
    } catch (error) {
      console.error('Failed to create terminal:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to create terminal: ${errorMessage}`);
    } finally {
      setIsCreatingTerminal(false);
    }
  };

  const handleCloseTerminal = async (terminalId: string, targetWorktreeId?: string) => {
    const worktreeIdToClose = targetWorktreeId || worktree?.id;
    if (!worktreeIdToClose) return;
    
    // Find the terminal to close across all worktrees
    let terminalToClose: TerminalSession | undefined;
    let sourceWorktreeId: string | undefined;
    
    for (const [wId, wTerminals] of Object.entries(terminalsByWorktree)) {
      const found = wTerminals.terminals.find(t => t.id === terminalId);
      if (found) {
        terminalToClose = found;
        sourceWorktreeId = wId;
        break;
      }
    }
    
    if (terminalToClose && terminalToClose.backendTerminalId) {
      try {
        await invoke('close_terminal', { terminalId: terminalToClose.backendTerminalId });
      } catch (error) {
        console.error('Failed to close backend terminal:', error);
        // Continue with frontend cleanup even if backend cleanup fails
      }
    }
    
    if (sourceWorktreeId) {
      // Update frontend state for the source worktree
      const sourceTerminals = terminalsByWorktree[sourceWorktreeId].terminals;
      const remainingTerminals = sourceTerminals.filter(t => t.id !== terminalId);
      const currentActiveId = terminalsByWorktree[sourceWorktreeId].activeTerminalId;
      const newActiveTerminalId = currentActiveId === terminalId 
        ? (remainingTerminals.length > 0 ? remainingTerminals[0].id : null)
        : currentActiveId;
      
      setTerminalsByWorktree(prev => ({
        ...prev,
        [sourceWorktreeId]: {
          terminals: remainingTerminals,
          activeTerminalId: newActiveTerminalId
        }
      }));
    }
  };

  const handleRenameTerminal = (terminalId: string, newName: string) => {
    if (!worktree) return;
    
    const updatedTerminals = terminals.map(t => 
      t.id === terminalId ? { ...t, name: newName } : t
    );
    
    setTerminalsByWorktree(prev => ({
      ...prev,
      [worktree.id]: {
        terminals: updatedTerminals,
        activeTerminalId: prev[worktree.id]?.activeTerminalId || null
      }
    }));
  };

  const setActiveTerminalId = (terminalId: string | null) => {
    if (!worktree) return;
    
    setTerminalsByWorktree(prev => ({
      ...prev,
      [worktree.id]: {
        terminals: prev[worktree.id]?.terminals || [],
        activeTerminalId: terminalId
      }
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full">
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
                onClick={handleCreateTerminalInternal}
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
                onClick={handleCreateTerminalInternal}
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

            {/* All Terminals (from all worktrees) - hidden/shown based on current worktree */}
            <div className="flex-1 p-4">
              {Object.entries(terminalsByWorktree).map(([worktreeId, worktreeTerminals]) =>
                worktreeTerminals.terminals.map((terminal) => (
                  <div
                    key={`${worktreeId}-${terminal.id}`}
                    style={{ 
                      display: worktreeId === worktree?.id && activeTerminalId === terminal.id ? 'block' : 'none',
                      height: '100%'
                    }}
                  >
                    <Terminal
                      terminalId={terminal.backendTerminalId}
                      worktreeId={worktreeId}
                      workingDirectory={terminal.workingDirectory}
                      name={terminal.name}
                      onClose={() => handleCloseTerminal(terminal.id, worktreeId)}
                    />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}