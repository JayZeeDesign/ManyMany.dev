import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Sidebar';
import { ProjectForm } from './components/ProjectForm';
import { WorktreeView } from './components/WorktreeView';
import { useProjectStore } from './stores/projectStore';
import { useTerminalStore } from './stores/terminalStore';
import { FolderGit2, GitBranch, ChevronRight, Plus } from 'lucide-react';

function App() {
  const { selectedProjectId, selectedWorktreeId, getSelectedProject, getSelectedWorktree, selectWorktree } = useProjectStore();
  const { 
    terminals: allTerminals, 
    setBackendTerminalId, 
    restoreTerminalSessions 
  } = useTerminalStore();
  
  const selectedProject = getSelectedProject();
  const selectedWorktree = getSelectedWorktree();
  
  // Track if restoration has been attempted to prevent multiple restoration attempts
  const restorationAttempted = useRef(false);

  // Global terminal restoration - runs once on app startup
  useEffect(() => {
    const handleTerminalRestoration = async () => {
      if (restorationAttempted.current) {
        return;
      }
      restorationAttempted.current = true;
      
      // Only restore if there are persisted terminals without backend IDs (meaning app was restarted)
      const terminalsToRestore = allTerminals.filter(t => !t.backendTerminalId);
      
      if (terminalsToRestore.length > 0) {
        // Call the store method to clear old backend IDs
        restoreTerminalSessions();
        
        for (const terminal of terminalsToRestore) {
          try {
            const backendTerminalId = await invoke('create_terminal', {
              request: {
                worktree_id: terminal.worktreeId,
                name: terminal.name,
                working_directory: terminal.workingDirectory
              }
            }) as string;
            
            setBackendTerminalId(terminal.id, backendTerminalId);
          } catch (error) {
            console.error(`Failed to restore terminal "${terminal.name}":`, error);
          }
        }
      }
    };

    handleTerminalRestoration();
  }, [allTerminals, setBackendTerminalId, restoreTerminalSessions]);
  
  // Helper function to extract worktree name from path
  const getWorktreeName = (worktreePath: string) => {
    const pathParts = worktreePath.split('/');
    return pathParts[pathParts.length - 1] || 'Unnamed';
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'rgb(var(--color-background))', color: 'rgb(var(--color-foreground))' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Breadcrumb Navigation */}
        <div className="min-h-12 h-12 flex items-center justify-between px-6 titlebar flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-card))', borderBottom: '1px solid rgb(var(--color-border))' }}>
          <div className="flex items-center space-x-2">
            {selectedProject ? (
              <div className="flex items-center gap-2 text-sm">
                <FolderGit2 className="w-4 h-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                <button
                  onClick={() => selectWorktree(null)}
                  className="hover:underline"
                  style={{ color: selectedWorktree ? 'rgb(var(--color-muted-foreground))' : 'rgb(var(--color-foreground))' }}
                >
                  {selectedProject.name}
                </button>
                {selectedWorktree && (
                  <>
                    <ChevronRight className="w-3 h-3" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                    <GitBranch className="w-4 h-4" style={{ color: 'rgb(var(--color-primary))' }} />
                    <span style={{ color: 'rgb(var(--color-foreground))' }} className="font-medium">
                      {getWorktreeName(selectedWorktree.path)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ 
                      backgroundColor: 'rgb(var(--color-muted))',
                      color: 'rgb(var(--color-muted-foreground))'
                    }}>
                      {selectedWorktree.branch}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>Add a new project to get started</span>
            )}
          </div>
          
          {/* Action Buttons */}
          {selectedWorktree && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // This will be handled by WorktreeView - we'll need to pass this down
                  const event = new CustomEvent('createTerminal');
                  document.dispatchEvent(event);
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary))',
                  color: 'rgb(var(--color-primary-foreground))'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Plus className="w-4 h-4" />
                New Terminal
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden" style={{ position: 'relative' }}>
          {/* WorktreeView - ALWAYS rendered to preserve terminal sessions */}
          <WorktreeView />

          {/* Other Content Areas - overlay when WorktreeView is not active */}
          {!(selectedWorktreeId && selectedWorktree) && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgb(var(--color-background))',
                zIndex: 10
              }}
            >
              {selectedProjectId === null ? (
                <div className="flex-1 overflow-y-auto h-full">
                  <ProjectForm mode="create" />
                </div>
              ) : selectedProject ? (
                <div className="flex-1 overflow-y-auto h-full">
                  <ProjectForm mode="edit" />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center">
                    <h2 className="text-2xl font-light mb-4" style={{ color: 'rgb(var(--color-foreground))' }}>Welcome to Worktree Studio</h2>
                    <p className="mb-6" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                      Add a project to get started
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;