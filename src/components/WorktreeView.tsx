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
  
  // Get project-specific terminal settings
  const { getProjectTerminalSettings } = useProjectStore();
  const defaultTerminals = project ? getProjectTerminalSettings(project.id) : [];

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
  
  // No longer track worktrees with defaults - always create defaults when visiting worktree with no terminals
  
  // Track which terminal is being edited
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const editingStartTime = useRef<number>(0);

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

  // Auto-create default terminals when a worktree has no terminals
  useEffect(() => {
    if (!worktree || !worktree.id) return;
    
    // Always create defaults if worktree has no terminals (simplified logic)
    const existingTerminals = getTerminalsForWorktree(worktree.id);
    if (existingTerminals.length > 0) {
      return;
    }
    
    console.log(`[WorktreeView] Creating default terminals for worktree: ${worktree.id}`);
    
    // Create default terminals
    const createDefaultTerminals = async () => {
      if (defaultTerminals.length === 0) return;
      
      for (const defaultTerminal of defaultTerminals) {
        try {
          // Create terminal in store
          const newTerminal = createTerminal({
            name: defaultTerminal.name,
            worktreeId: worktree.id,
            workingDirectory: worktree.path,
            autoCommand: defaultTerminal.command.trim() || undefined,
          });
          
          // Create backend terminal
          const backendTerminalId = await invoke('create_terminal', {
            request: {
              worktree_id: worktree.id,
              name: defaultTerminal.name,
              working_directory: worktree.path
            }
          }) as string;
          
          // Update terminal with backend ID
          setBackendTerminalId(newTerminal.id, backendTerminalId);
          
        } catch (error) {
          console.error(`Failed to create default terminal "${defaultTerminal.name}":`, error);
        }
      }
    };
    
    // Small delay to ensure worktree is fully loaded
    setTimeout(createDefaultTerminals, 300);
    
  }, [worktree, defaultTerminals, getTerminalsForWorktree, createTerminal, setBackendTerminalId]);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (editingTerminalId && editingInputRef.current) {
      console.log(`[WorktreeView] Focusing input for terminal: ${editingTerminalId}`);
      // Simple focus with a small delay to ensure DOM is updated
      setTimeout(() => {
        if (editingInputRef.current) {
          editingInputRef.current.focus();
          editingInputRef.current.select();
          console.log(`[WorktreeView] Input focused and text selected`);
        }
      }, 10);
    }
  }, [editingTerminalId]);

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
    <div className="flex-1 flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Terminal Area - ALWAYS rendered to prevent unmounting */}
      <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
        {/* Terminal Tabs - show if current worktree has terminals */}
        {terminals.length > 0 && (
          <div className="h-9 flex items-center gap-1 px-4 border-b overflow-x-auto flex-shrink-0" 
               style={{ borderColor: 'rgb(var(--color-border))' }}>
            {terminals.map((terminal) => {
              console.log(`[WorktreeView] Rendering terminal tab: ${terminal.name}, isEditing: ${editingTerminalId === terminal.id}, editingId: ${editingTerminalId}`);
              return (
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
                  onClick={(e) => {
                    console.log(`[WorktreeView] Tab clicked - terminal: ${terminal.name}, editing: ${editingTerminalId}, isActive: ${activeTerminalId === terminal.id}, target:`, e.target);
                    
                    // Don't switch tabs if this terminal is already active
                    if (activeTerminalId === terminal.id) {
                      console.log(`[WorktreeView] Ignoring click - terminal already active`);
                      return;
                    }
                    
                    // Don't switch tabs if we're editing this terminal's name
                    if (editingTerminalId === terminal.id) {
                      console.log(`[WorktreeView] Ignoring click - currently editing this terminal`);
                      return;
                    }
                    
                    console.log(`[WorktreeView] Switching to terminal: ${terminal.name}`);
                    setActiveTerminalId(terminal.id);
                  }}
                >
                  <TerminalIcon className="w-3 h-3" />
                  {editingTerminalId === terminal.id ? (
                    <input
                      ref={editingInputRef}
                      type="text"
                      defaultValue={terminal.name}
                      className="text-sm bg-transparent border-none outline-none px-0 py-0 min-w-0"
                      style={{ 
                        color: 'rgb(var(--color-foreground))',
                        fontSize: '0.875rem',
                        lineHeight: '1.25rem',
                        width: 'auto',
                        maxWidth: '120px'
                      }}
                      onBlur={(e) => {
                        console.log(`[WorktreeView] Input blur - terminal: ${terminal.name}, value: ${e.target.value}`);
                        const newName = e.target.value.trim() || terminal.name;
                        if (newName !== terminal.name) {
                          console.log(`[WorktreeView] Renaming terminal from "${terminal.name}" to "${newName}"`);
                          handleRenameTerminal(terminal.id, newName);
                        }
                        console.log(`[WorktreeView] Exiting edit mode`);
                        setEditingTerminalId(null);
                      }}
                      onKeyDown={(e) => {
                        console.log(`[WorktreeView] Input keydown - key: ${e.key}`);
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const newName = e.currentTarget.value.trim() || terminal.name;
                          console.log(`[WorktreeView] Enter pressed - saving name: ${newName}`);
                          if (newName !== terminal.name) {
                            handleRenameTerminal(terminal.id, newName);
                          }
                          setEditingTerminalId(null);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          console.log(`[WorktreeView] Escape pressed - canceling edit`);
                          setEditingTerminalId(null);
                        }
                      }}
                      onFocus={() => {
                        console.log(`[WorktreeView] Input focused successfully`);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span 
                      className="text-sm select-none cursor-pointer"
                      onDoubleClick={(e) => {
                        console.log(`[WorktreeView] Double-click detected on terminal: ${terminal.name}`);
                        e.stopPropagation();
                        
                        console.log(`[WorktreeView] Setting edit mode for terminal: ${terminal.id}`);
                        editingStartTime.current = Date.now();
                        setEditingTerminalId(terminal.id);
                        console.log(`[WorktreeView] Edit state after setting: ${terminal.id}`);
                      }}
                    >
                      {terminal.name}
                    </span>
                  )}
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
              );
            })}
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
        <div className="flex-1 relative" style={{ 
          backgroundColor: '#000000', 
          minHeight: '200px', // Ensure minimum usable height
          height: '100%'
        }}>
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
                      minHeight: '200px', // Prevent collapse below usable size
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
                      autoCommand={terminal.autoCommand}
                    />
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}