import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, X, Terminal as TerminalIcon } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { Terminal } from './Terminal';

export function WorktreeView() {
  const { getSelectedProject, getSelectedWorktree } = useProjectStore();
  const project = getSelectedProject();
  const worktree = getSelectedWorktree();
  

  // Use terminal store instead of local state
  const {
    terminals: allTerminals,
    createTerminal,
    closeTerminal,
    renameTerminal,
    setActiveTerminal,
    setBackendTerminalId,
    getTerminalsForWorktree,
    getActiveTerminalForWorktree,
  } = useTerminalStore();

  // Store refs to terminal components for focusing
  const terminalRefs = useRef<Record<string, { focus: () => void }>>({});

  // Get current worktree's terminals from store
  const terminals = worktree ? getTerminalsForWorktree(worktree.id) : [];
  const activeTerminal = worktree ? getActiveTerminalForWorktree(worktree.id) : undefined;
  const activeTerminalId = activeTerminal?.id || null;

  // Local state for terminal creation loading
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  
  // Get current worktree ID from store to avoid dependency on props
  const currentWorktreeId = useProjectStore(state => state.selectedWorktreeId);

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

  const handleCreateTerminalInternal = async () => {
    if (isCreatingTerminal || !worktree) return;
    
    const terminalName = `Terminal ${terminals.length + 1}`;
    setIsCreatingTerminal(true);
    
    try {
      // Create terminal session in store first
      const newTerminal = createTerminal({
        name: terminalName,
        worktreeId: worktree.id,
        workingDirectory: worktree.path,
      });

      // Create backend terminal
      const backendTerminalId = await invoke('create_terminal', {
        request: {
          worktree_id: worktree.id,
          name: terminalName,
          working_directory: worktree.path
        }
      }) as string;
      
      // Update terminal with backend ID
      setBackendTerminalId(newTerminal.id, backendTerminalId);
      
      // Focus the new terminal after a delay to ensure it's rendered
      setTimeout(() => {
        if (terminalRefs.current[newTerminal.id]) {
          terminalRefs.current[newTerminal.id].focus();
        }
      }, 200);
      
    } catch (error) {
      console.error('Failed to create terminal:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to create terminal: ${errorMessage}`);
    } finally {
      setIsCreatingTerminal(false);
    }
  };

  const handleCloseTerminal = async (terminalId: string) => {
    // Get terminal from store
    const terminal = useTerminalStore.getState().getTerminalById(terminalId);
    
    if (terminal?.backendTerminalId) {
      try {
        await invoke('close_terminal', { terminalId: terminal.backendTerminalId });
      } catch (error) {
        console.error('Failed to close backend terminal:', error);
        // Continue with frontend cleanup even if backend cleanup fails
      }
    }
    
    // Close terminal in store (this handles all the state updates)
    closeTerminal(terminalId);
    
    // Clean up terminal ref
    delete terminalRefs.current[terminalId];
  };

  const handleRenameTerminal = (terminalId: string, newName: string) => {
    renameTerminal(terminalId, newName);
  };

  const setActiveTerminalId = (terminalId: string | null) => {
    if (!worktree) return;
    
    setActiveTerminal(worktree.id, terminalId);
    
    // Focus the terminal after a short delay to ensure it's rendered
    if (terminalId && terminalRefs.current[terminalId]) {
      setTimeout(() => {
        terminalRefs.current[terminalId]?.focus();
      }, 100);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Terminal Area - ALWAYS rendered to prevent unmounting */}
      <div className="flex-1 flex flex-col">
        {/* Terminal Tabs - show if current worktree has terminals */}
        {terminals.length > 0 && (
          <div className="h-9 flex items-center gap-1 px-4 border-b overflow-x-auto flex-shrink-0" 
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
                      ? '1px solid rgb(var(--color-primary))' 
                      : '1px solid transparent'
                  }}
                  onClick={() => setActiveTerminalId(terminal.id)}
                >
                  <TerminalIcon className="w-3 h-3" />
                  <span 
                    className="text-sm select-none"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const span = e.currentTarget;
                      span.contentEditable = 'true';
                      span.focus();
                      
                      // Select all text
                      const range = document.createRange();
                      range.selectNodeContents(span);
                      const selection = window.getSelection();
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                    }}
                    onBlur={(e) => {
                      const span = e.currentTarget;
                      span.contentEditable = 'false';
                      const newName = span.textContent || terminal.name;
                      if (newName !== terminal.name) {
                        handleRenameTerminal(terminal.id, newName);
                      }
                      span.textContent = newName; // Ensure display is correct
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.currentTarget.textContent = terminal.name; // Reset to original
                        e.currentTarget.blur();
                      }
                    }}
                    suppressContentEditableWarning
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
        )}

        {/* All Terminals (global list) - ALWAYS rendered to persist across worktree switches */}
        <div className="flex-1 relative" style={{ backgroundColor: '#000000' }}>
          {/* No terminals overlay - shown when current worktree has no terminals */}
          {terminals.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10" 
                 style={{ backgroundColor: '#000000' }}>
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
          )}
          
          {/* All terminal instances - always rendered, never unmounted */}
          {allTerminals.map((terminal) => {
                // Use store-based worktree ID to avoid component prop dependency
                const currentActiveTerminal = currentWorktreeId ? getActiveTerminalForWorktree(currentWorktreeId) : null;
                const shouldShow = terminal.worktreeId === currentWorktreeId && 
                                   terminal.id === currentActiveTerminal?.id;
                
                return (
                  <div
                    key={`terminal-${terminal.id}`} // Stable key to prevent remounting
                    style={{ 
                      display: shouldShow ? 'block' : 'none',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      paddingLeft: '8px'
                    }}
                  >
                    <Terminal
                      key={`terminal-component-${terminal.id}`} // Additional stable key
                      ref={(terminalRef) => {
                        if (terminalRef) {
                          terminalRefs.current[terminal.id] = terminalRef;
                        }
                      }}
                      terminalId={terminal.backendTerminalId}
                      worktreeId={terminal.worktreeId}
                      workingDirectory={terminal.workingDirectory}
                      name={terminal.name}
                    />
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}