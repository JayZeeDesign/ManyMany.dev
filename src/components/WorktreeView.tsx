import { useState, useEffect, useRef } from 'react';
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

  // Store ALL terminal sessions globally to prevent unmounting
  const [allTerminals, setAllTerminals] = useState<TerminalSession[]>([]);
  
  // Store terminal sessions per worktree ID (just IDs and active states)
  const [terminalsByWorktree, setTerminalsByWorktree] = useState<Record<string, {
    terminalIds: string[];
    activeTerminalId: string | null;
  }>>({});
  const [isCreatingTerminal, setIsCreatingTerminal] = useState(false);
  
  // Store refs to terminal components for focusing
  const terminalRefs = useRef<Record<string, { focus: () => void }>>({});

  // Get current worktree's terminals
  const currentWorktreeTerminals = worktree ? terminalsByWorktree[worktree.id] : null;
  const terminalIds = currentWorktreeTerminals?.terminalIds || [];
  const terminals = allTerminals.filter(terminal => terminalIds.includes(terminal.id));
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
      
      // Add to global terminals list
      setAllTerminals(prev => [...prev, newTerminal]);
      
      // Update terminals for current worktree
      setTerminalsByWorktree(prev => ({
        ...prev,
        [worktree.id]: {
          terminalIds: [...terminalIds, newTerminal.id],
          activeTerminalId: newTerminal.id
        }
      }));
      
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

  const handleCloseTerminal = async (terminalId: string, targetWorktreeId?: string) => {
    const worktreeIdToClose = targetWorktreeId || worktree?.id;
    if (!worktreeIdToClose) return;
    
    // Find the terminal to close
    const terminalToClose = allTerminals.find(t => t.id === terminalId);
    
    if (terminalToClose && terminalToClose.backendTerminalId) {
      try {
        await invoke('close_terminal', { terminalId: terminalToClose.backendTerminalId });
      } catch (error) {
        console.error('Failed to close backend terminal:', error);
        // Continue with frontend cleanup even if backend cleanup fails
      }
    }
    
    // Find which worktree owns this terminal
    let sourceWorktreeId: string | undefined;
    for (const [wId, wTerminals] of Object.entries(terminalsByWorktree)) {
      if (wTerminals.terminalIds.includes(terminalId)) {
        sourceWorktreeId = wId;
        break;
      }
    }
    
    if (sourceWorktreeId) {
      // Update frontend state for the source worktree
      const sourceTerminalIds = terminalsByWorktree[sourceWorktreeId].terminalIds;
      const remainingTerminalIds = sourceTerminalIds.filter(id => id !== terminalId);
      const currentActiveId = terminalsByWorktree[sourceWorktreeId].activeTerminalId;
      const newActiveTerminalId = currentActiveId === terminalId 
        ? (remainingTerminalIds.length > 0 ? remainingTerminalIds[0] : null)
        : currentActiveId;
      
      setTerminalsByWorktree(prev => ({
        ...prev,
        [sourceWorktreeId]: {
          terminalIds: remainingTerminalIds,
          activeTerminalId: newActiveTerminalId
        }
      }));
      
      // Remove from global terminals list
      setAllTerminals(prev => prev.filter(t => t.id !== terminalId));
      
      // Clean up terminal ref
      delete terminalRefs.current[terminalId];
    }
  };

  const handleRenameTerminal = (terminalId: string, newName: string) => {
    // Update the global terminals list
    setAllTerminals(prev => prev.map(t => 
      t.id === terminalId ? { ...t, name: newName } : t
    ));
  };

  const setActiveTerminalId = (terminalId: string | null) => {
    if (!worktree) return;
    
    setTerminalsByWorktree(prev => ({
      ...prev,
      [worktree.id]: {
        terminalIds: prev[worktree.id]?.terminalIds || [],
        activeTerminalId: terminalId
      }
    }));
    
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
          
          {/* All terminal instances - always rendered but hidden when not active */}
          {allTerminals.map((terminal) => {
                // Find which worktree owns this terminal
                let terminalWorktreeId: string | undefined;
                for (const [wId, wTerminals] of Object.entries(terminalsByWorktree)) {
                  if (wTerminals.terminalIds.includes(terminal.id)) {
                    terminalWorktreeId = wId;
                    break;
                  }
                }
                
                const isCurrentWorktreeActiveTerminal = terminalWorktreeId === worktree?.id && activeTerminalId === terminal.id;
                return (
                  <div
                    key={terminal.id}
                    style={{ 
                      display: isCurrentWorktreeActiveTerminal ? 'block' : 'none',
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
                      ref={(terminalRef) => {
                        if (terminalRef) {
                          terminalRefs.current[terminal.id] = terminalRef;
                        }
                      }}
                      terminalId={terminal.backendTerminalId}
                      worktreeId={terminalWorktreeId || ''}
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