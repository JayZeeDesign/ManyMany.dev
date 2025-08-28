import { invoke } from '@tauri-apps/api/core';
import { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ProjectForm } from './components/ProjectForm';
import { WorktreeView } from './components/WorktreeView';
import { FileChangesPanel } from './components/FileChangesPanel';
import { UpdateBanner } from './components/UpdateBanner';
import { UpdateDialog } from './components/UpdateDialog';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { AppSettings } from './components/AppSettings';
import { useProjectStore } from './stores/projectStore';
import { useUpdateStore } from './stores/updateStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { FolderGit2, GitBranch, ChevronRight, ChevronDown, Folder, Code, FileText, RefreshCw, Settings } from 'lucide-react';

function App() {
  const { selectedProjectId, selectedWorktreeId, getSelectedProject, getSelectedWorktree, selectWorktree, showFileChangesPanel, toggleFileChangesPanel } = useProjectStore();
  const { checkForUpdates, autoCheckEnabled, checking } = useUpdateStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  const selectedProject = getSelectedProject();
  const selectedWorktree = getSelectedWorktree();

  // Check for updates on startup
  useEffect(() => {
    const performUpdateCheck = async () => {
      if (autoCheckEnabled) {
        try {
          // Wait a bit after app startup before checking
          setTimeout(async () => {
            await checkForUpdates(true); // silent check
          }, 3000);
        } catch (error) {
          console.error('Auto update check failed:', error);
        }
      }
    };

    performUpdateCheck();
  }, [checkForUpdates, autoCheckEnabled]);
  
  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);
  
  // Handle opening in different applications
  const handleOpenIn = async (app: 'cursor' | 'vscode' | 'finder') => {
    if (!selectedWorktree) return;
    
    setIsDropdownOpen(false);
    
    try {
      console.log(`[App] Opening ${selectedWorktree.path} in ${app}`);
      await invoke('open_in_app', { path: selectedWorktree.path, app });
    } catch (error) {
      console.error(`Failed to open in ${app}:`, error);
    }
  };
  
  // Handle manual update check
  const handleCheckForUpdates = async () => {
    setIsDropdownOpen(false);
    try {
      await checkForUpdates(false); // non-silent check
    } catch (error) {
      console.error('Manual update check failed:', error);
    }
  };

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
        {/* Update Banner */}
        <UpdateBanner />
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
          <div className="flex items-center gap-2">
            {/* App Settings - Always visible */}
            <button
              onClick={() => setShowAppSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
              style={{ 
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-muted-foreground))',
                border: '1px solid rgb(var(--color-border))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="App settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            
            {/* Keyboard Shortcuts Help - Always visible */}
            <KeyboardShortcutsHelp />
            
            {/* Update Check Button - Always visible */}
            <button
              onClick={handleCheckForUpdates}
              disabled={checking}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all disabled:opacity-50"
              style={{ 
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-muted-foreground))',
                border: '1px solid rgb(var(--color-border))'
              }}
              onMouseEnter={(e) => {
                if (!checking) {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                }
              }}
              onMouseLeave={(e) => {
                if (!checking) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Check for updates"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{checking ? 'Checking...' : 'Updates'}</span>
            </button>

            {selectedWorktree && (
              <>
              <button
                onClick={toggleFileChangesPanel}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
                style={{ 
                  backgroundColor: showFileChangesPanel ? 'rgb(var(--color-primary))' : 'transparent',
                  color: showFileChangesPanel ? 'rgb(var(--color-primary-foreground))' : 'rgb(var(--color-muted-foreground))',
                  border: '1px solid rgb(var(--color-border))'
                }}
                onMouseEnter={(e) => {
                  if (!showFileChangesPanel) {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showFileChangesPanel) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title="File changes"
              >
                <FileText className="w-4 h-4" />
                <span>File changes</span>
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
                  style={{ 
                    backgroundColor: isDropdownOpen ? 'rgb(var(--color-muted))' : 'transparent',
                    color: 'rgb(var(--color-muted-foreground))',
                    border: '1px solid rgb(var(--color-border))'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDropdownOpen) {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDropdownOpen) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Folder className="w-4 h-4" />
                  <span>Open</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {isDropdownOpen && (
                  <div 
                    className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg z-50"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-popover))',
                      border: '1px solid rgb(var(--color-border))'
                    }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => handleOpenIn('finder')}
                        className="w-full px-3 py-2 text-sm text-left flex items-center gap-3 transition-colors"
                        style={{ color: 'rgb(var(--color-popover-foreground))' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                          e.currentTarget.style.color = 'rgb(var(--color-accent-foreground))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'rgb(var(--color-popover-foreground))';
                        }}
                      >
                        <Folder className="w-4 h-4" />
                        Finder
                      </button>
                      
                      <button
                        onClick={() => handleOpenIn('cursor')}
                        className="w-full px-3 py-2 text-sm text-left flex items-center gap-3 transition-colors"
                        style={{ color: 'rgb(var(--color-popover-foreground))' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                          e.currentTarget.style.color = 'rgb(var(--color-accent-foreground))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'rgb(var(--color-popover-foreground))';
                        }}
                      >
                        <Code className="w-4 h-4" />
                        Cursor
                      </button>
                      
                      <button
                        onClick={() => handleOpenIn('vscode')}
                        className="w-full px-3 py-2 text-sm text-left flex items-center gap-3 transition-colors"
                        style={{ color: 'rgb(var(--color-popover-foreground))' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                          e.currentTarget.style.color = 'rgb(var(--color-accent-foreground))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'rgb(var(--color-popover-foreground))';
                        }}
                      >
                        <Code className="w-4 h-4" />
                        VS Code
                      </button>

                      {/* Separator */}
                      <div 
                        className="my-1 h-px"
                        style={{ backgroundColor: 'rgb(var(--color-border))' }}
                      />

                      <button
                        onClick={handleCheckForUpdates}
                        disabled={checking}
                        className="w-full px-3 py-2 text-sm text-left flex items-center gap-3 transition-colors disabled:opacity-50"
                        style={{ color: 'rgb(var(--color-popover-foreground))' }}
                        onMouseEnter={(e) => {
                          if (!checking) {
                            e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                            e.currentTarget.style.color = 'rgb(var(--color-accent-foreground))';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!checking) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'rgb(var(--color-popover-foreground))';
                          }
                        }}
                      >
                        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                        {checking ? 'Checking...' : 'Check for Updates'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden" style={{ position: 'relative' }}>
          {/* Main Content - WorktreeView and other content */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
                      <h2 className="text-2xl font-light mb-4" style={{ color: 'rgb(var(--color-foreground))' }}>Welcome to ManyMany.dev</h2>
                      <p className="mb-6" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                        Add a project to get started
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File Changes Panel */}
          <FileChangesPanel />
        </div>
      </div>
      
      {/* Update Dialog */}
      <UpdateDialog />
      
      {/* App Settings */}
      <AppSettings isOpen={showAppSettings} onClose={() => setShowAppSettings(false)} />
    </div>
  );
}

export default App;