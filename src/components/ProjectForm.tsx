import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, FileCode2, GitBranch, X, Trash2, Plus, FolderGit2, ExternalLink, ChevronRight, Settings } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { DefaultTerminalConfig } from '@/stores/settingsStore';
import { CreateWorktreeDialog } from './CreateWorktreeDialog';
import { TerminalSettings } from './TerminalSettings';
import { invoke } from '@tauri-apps/api/core';

interface ProjectFormProps {
  mode: 'create' | 'edit';
}

export function ProjectForm({ mode }: ProjectFormProps) {
  const { getSelectedProject, addProject, updateProject, removeProject, selectProject, selectWorktree, showCreateWorktreeDialog, setShowCreateWorktreeDialog, updateProjectTerminalSettings } = useProjectStore();
  const selectedProject = mode === 'edit' ? getSelectedProject() : null;

  // Helper function to extract worktree name from path
  const getWorktreeName = (worktreePath: string) => {
    const pathParts = worktreePath.split('/');
    return pathParts[pathParts.length - 1] || 'Unnamed';
  };
  
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [projectType, setProjectType] = useState<'repository' | 'workspace'>('repository');
  const [workspaceRepos, setWorkspaceRepos] = useState<WorkspaceRepo[]>([]);
  const [worktrees, setWorktrees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'project' | 'terminal'>('project');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // Step-based navigation for create mode
  
  // Preview terminal settings for create mode
  const [previewTerminals, setPreviewTerminals] = useState<DefaultTerminalConfig[]>([
    {
      id: 'default-1',
      name: 'Claude code',
      command: 'claude',
      enabled: true,
    }
  ]);
  

  interface WorkspaceRepo {
    name: string;
    path: string;
    default_branch: string;
    is_git_repo: boolean;
  }

  // Initialize form with existing project data in edit mode
  useEffect(() => {
    if (mode === 'edit' && selectedProject) {
      setProjectName(selectedProject.name);
      setProjectPath(selectedProject.path);
      setDefaultBranch(selectedProject.defaultBranch || 'main');
      setProjectType(selectedProject.type);
      
      // Reset worktrees state and load fresh data for repository projects
      setWorktrees([]);
      if (selectedProject.type === 'repository') {
        loadWorktrees();
      }
    } else if (mode === 'create') {
      // Reset form for create mode
      setProjectName('');
      setProjectPath('');
      setDefaultBranch('main');
      setProjectType('repository');
      setCurrentStep(1);
      setWorktrees([]);
      setPreviewTerminals([{
        id: 'default-1',
        name: 'Claude code',
        command: 'claude',
        enabled: true,
      }]);
    }
  }, [mode, selectedProject?.id]); // Only depend on project ID, not the full object

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Repository Folder'
      });
      
      if (selected && typeof selected === 'string') {
        setProjectPath(selected);
        
        // Auto-detect project name from folder
        const folderName = selected.split('/').pop() || selected.split('\\').pop() || '';
        if (!projectName) {
          setProjectName(folderName);
        }
        
        // Auto-detect if it's a git repository and get default branch
        try {
          const isGitRepo = await invoke<boolean>('is_git_repository', { path: selected });
          if (isGitRepo) {
            setProjectType('repository');
            const branch = await invoke<string>('get_default_branch', { path: selected });
            setDefaultBranch(branch || 'main');
          } else {
            setProjectType('workspace');
          }
        } catch (error) {
          setProjectType('workspace');
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const updateWorkspaceRepoBranch = (repoIndex: number, newBranch: string) => {
    setWorkspaceRepos(prev => 
      prev.map((repo, index) => 
        index === repoIndex 
          ? { ...repo, default_branch: newBranch }
          : repo
      )
    );
  };

  const loadWorktrees = async () => {
    if (!selectedProject || selectedProject.type !== 'repository') {
      return;
    }
    
    try {
      const projectWorktrees = await invoke<any[]>('list_worktrees', {
        projectPath: selectedProject.path
      });
      setWorktrees(projectWorktrees);
      
      // Update the project store with the loaded worktrees
      const formattedWorktrees = projectWorktrees.map(wt => ({
        id: wt.id,
        branch: wt.branch,
        path: wt.path,
        createdAt: new Date(wt.created_at)
      }));
      
      updateProject(selectedProject.id, {
        worktrees: formattedWorktrees
      });
      
    } catch (error) {
      console.error('Failed to load worktrees:', error);
      setWorktrees([]);
    }
  };

  const handleWorktreeCreated = (worktree: any) => {
    setWorktrees(prev => [...prev, worktree]);
    // Update the project store with new worktree
    if (selectedProject) {
      updateProject(selectedProject.id, {
        worktrees: [...(selectedProject.worktrees || []), {
          id: worktree.id,
          branch: worktree.branch,
          path: worktree.path,
          createdAt: new Date(worktree.created_at)
        }]
      });
    }
  };

  const handleDeleteWorktree = async (worktree: any) => {
    if (!window.confirm(`Are you sure you want to delete the worktree for "${worktree.branch}"?`)) {
      return;
    }

    try {
      await invoke('remove_worktree', {
        projectPath: selectedProject?.path,
        worktreePath: worktree.path
      });
      
      setWorktrees(prev => prev.filter(w => w.id !== worktree.id));
      
      // Update the project store to remove the worktree
      if (selectedProject) {
        updateProject(selectedProject.id, {
          worktrees: (selectedProject.worktrees || []).filter(w => w.id !== worktree.id)
        });
      }
    } catch (error) {
      console.error('Failed to delete worktree:', error);
      // TODO: Show error toast
    }
  };

  const handleOpenInEditor = async (worktreePath: string) => {
    try {
      await invoke('open_editor', { path: worktreePath });
    } catch (error) {
      console.error('Failed to open editor:', error);
    }
  };

  const handleSave = async () => {
    if (!projectName || !projectPath) {
      return;
    }

    try {
      if (mode === 'create') {
        const result = await invoke('add_project', {
          request: {
            name: projectName,
            path: projectPath,
            project_type: projectType,
            default_branch: projectType === 'repository' ? defaultBranch : null,
            workspace_repos: projectType === 'workspace' ? workspaceRepos : null
          }
        });
        
        // Add to store
        const createdProject = result as any;
        addProject(createdProject);
        
        // Apply preview terminal settings to the newly created project
        updateProjectTerminalSettings(createdProject.id, previewTerminals);
        
        // Load worktrees for the newly created project (to discover default worktree)
        if (createdProject.project_type === 'repository') {
          try {
            const projectWorktrees = await invoke<any[]>('list_worktrees', {
              projectPath: createdProject.path
            });
            
            // Format and update project with discovered worktrees
            const formattedWorktrees = projectWorktrees.map(wt => ({
              id: wt.id,
              branch: wt.branch,
              path: wt.path,
              createdAt: new Date(wt.created_at)
            }));
            
            updateProject(createdProject.id, {
              worktrees: formattedWorktrees
            });
            
            // Auto-select the project and its first worktree (default repository)
            selectProject(createdProject.id);
            if (formattedWorktrees.length > 0) {
              selectWorktree(formattedWorktrees[0].id);
            }
          } catch (error) {
            console.error('Failed to load worktrees for new project:', error);
            // Still select the project even if worktree loading fails
            selectProject(createdProject.id);
          }
        } else {
          // For workspace projects, just select the project
          selectProject(createdProject.id);
        }
        
        // Reset form
        setProjectName('');
        setProjectPath('');
        setDefaultBranch('main');
        setProjectType('repository');
        setCurrentStep(1);
        setPreviewTerminals([{
          id: 'default-1',
          name: 'Claude code',
          command: 'claude',
          enabled: true,
        }]);
      } else if (mode === 'edit' && selectedProject) {
        const updates: Partial<typeof selectedProject> = {
          name: projectName.trim()
        };
        
        if (projectType === 'repository') {
          updates.defaultBranch = defaultBranch || undefined;
        }

        updateProject(selectedProject.id, updates);
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      // TODO: Show error toast
    }
  };

  const handleCancel = () => {
    if (mode === 'create') {
      setProjectName('');
      setProjectPath('');
      setDefaultBranch('main');
      setProjectType('repository');
      setCurrentStep(1);
      setPreviewTerminals([{
        id: 'default-1',
        name: 'Claude code',
        command: 'claude',
        enabled: true,
      }]);
    } else if (mode === 'edit') {
      selectProject(null); // Go back to add project view
    }
  };

  const handleDeleteProject = () => {
    if (selectedProject && window.confirm(`Are you sure you want to remove "${selectedProject.name}" from the project list?`)) {
      removeProject(selectedProject.id);
    }
  };

  const isCreateMode = mode === 'create';
  const title = isCreateMode ? 'Add New Project' : 'Edit Project';
  const saveButtonText = isCreateMode ? 'Add Project' : 'Save Changes';

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {!isCreateMode && (
            <button
              onClick={handleDeleteProject}
              className="p-2 rounded-md transition-all"
              style={{ 
                backgroundColor: 'rgb(var(--color-secondary))',
                color: 'rgb(var(--color-secondary-foreground))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-destructive))';
                e.currentTarget.style.color = 'rgb(var(--color-destructive-foreground))';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-secondary))';
                e.currentTarget.style.color = 'rgb(var(--color-secondary-foreground))';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Tab Navigation - Different behavior for create vs edit mode */}
        {isCreateMode ? (
          /* Step indicator for create mode */
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              {/* Step 1 */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1 ? 'text-white' : ''
                }`} style={{
                  backgroundColor: currentStep >= 1 ? 'rgb(var(--color-primary))' : 'rgb(var(--color-muted))',
                  color: currentStep >= 1 ? 'rgb(var(--color-primary-foreground))' : 'rgb(var(--color-muted-foreground))'
                }}>
                  1
                </div>
                <span className={`text-sm font-medium ${
                  currentStep === 1 ? '' : ''
                }`} style={{
                  color: currentStep === 1 ? 'rgb(var(--color-foreground))' : 'rgb(var(--color-muted-foreground))'
                }}>
                  Project Settings
                </span>
              </div>
              
              {/* Connector line */}
              <div className="w-8 h-px" style={{
                backgroundColor: currentStep >= 2 ? 'rgb(var(--color-primary))' : 'rgb(var(--color-muted))'
              }} />
              
              {/* Step 2 */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? 'text-white' : ''
                }`} style={{
                  backgroundColor: currentStep >= 2 ? 'rgb(var(--color-primary))' : 'rgb(var(--color-muted))',
                  color: currentStep >= 2 ? 'rgb(var(--color-primary-foreground))' : 'rgb(var(--color-muted-foreground))'
                }}>
                  2
                </div>
                <span className={`text-sm font-medium`} style={{
                  color: currentStep === 2 ? 'rgb(var(--color-foreground))' : 'rgb(var(--color-muted-foreground))'
                }}>
                  Terminal Settings
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Tab navigation for edit mode */
          <div className="flex border-b mb-6" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <button
              onClick={() => setActiveTab('project')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'project' ? '' : 'border-transparent'
              }`}
              style={{
                color: activeTab === 'project' 
                  ? 'rgb(var(--color-primary))' 
                  : 'rgb(var(--color-muted-foreground))',
                borderColor: activeTab === 'project' 
                  ? 'rgb(var(--color-primary))' 
                  : 'transparent'
              }}
            >
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4" />
                Project Settings
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'terminal' ? '' : 'border-transparent'
              }`}
              style={{
                color: activeTab === 'terminal' 
                  ? 'rgb(var(--color-primary))' 
                  : 'rgb(var(--color-muted-foreground))',
                borderColor: activeTab === 'terminal' 
                  ? 'rgb(var(--color-primary))' 
                  : 'transparent'
              }}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Terminal Settings
              </div>
            </button>
          </div>
        )}
        
        {/* Tab Content */}
        {((!isCreateMode && activeTab === 'project') || (isCreateMode && currentStep === 1)) && (
          <div className="space-y-6">
            {isCreateMode && (
            <div>
              <h2 className="text-lg font-medium mb-2">Import Options</h2>
              <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                Choose how you want to import your project
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className="h-32 flex flex-col items-center justify-center gap-2 rounded-md transition-all border"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-secondary))',
                    color: 'rgb(var(--color-secondary-foreground))',
                    borderColor: 'rgb(var(--color-border))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary))';
                    e.currentTarget.style.color = 'rgb(var(--color-primary-foreground))';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-secondary))';
                    e.currentTarget.style.color = 'rgb(var(--color-secondary-foreground))';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={handleSelectFolder}
                >
                  <FolderOpen className="h-8 w-8" />
                  <span className="text-sm font-medium">Repository Folder</span>
                  <span className="text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                    Import from a Git repository
                  </span>
                </button>
                
                <button
                  className="h-32 flex flex-col items-center justify-center gap-2 rounded-md transition-all border cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-muted) / 0.3)',
                    color: 'rgb(var(--color-muted-foreground))',
                    borderColor: 'rgb(var(--color-border))',
                    opacity: 0.6
                  }}
                  disabled
                  title="Coming soon"
                >
                  <FileCode2 className="h-8 w-8" />
                  <span className="text-sm font-medium">Workspace File</span>
                  <span className="text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                    Coming soon
                  </span>
                </button>
              </div>
            </div>
          )}

          {(projectPath || !isCreateMode) && (
            <div className="p-6 rounded-md border" style={{ 
              backgroundColor: 'rgb(var(--color-card))',
              borderColor: 'rgb(var(--color-border))'
            }}>
              <h2 className="text-lg font-medium mb-2">Project Details</h2>
              <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                Configure your project settings
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="project-name" className="text-sm font-medium">Project Name</label>
                  <input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-background))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-foreground))'
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="project-path" className="text-sm font-medium">Project Path</label>
                  <input
                    id="project-path"
                    value={projectPath}
                    readOnly={!isCreateMode}
                    className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors"
                    style={{
                      backgroundColor: isCreateMode ? 'rgb(var(--color-muted))' : 'rgb(var(--color-muted))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-foreground))'
                    }}
                  />
                </div>

                {projectType === 'repository' && (
                  <div className="space-y-2">
                    <label htmlFor="default-branch" className="text-sm font-medium">Default Branch</label>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                      <input
                        id="default-branch"
                        value={defaultBranch}
                        onChange={(e) => setDefaultBranch(e.target.value)}
                        placeholder="main"
                        className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors"
                        style={{
                          backgroundColor: 'rgb(var(--color-background))',
                          borderColor: 'rgb(var(--color-border))',
                          color: 'rgb(var(--color-foreground))'
                        }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                      This branch will be used to create new worktrees
                    </p>
                  </div>
                )}

                {projectType === 'workspace' && workspaceRepos.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Workspace Repositories</label>
                    <p className="text-xs mb-3" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                      Configure default branches for Git repositories found in this workspace
                    </p>
                    <div className="space-y-3">
                      {workspaceRepos.map((repo, index) => (
                        <div 
                          key={index} 
                          className="p-3 rounded border"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-background))',
                            borderColor: 'rgb(var(--color-border))'
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FolderGit2 className="w-4 h-4" style={{ 
                                color: repo.is_git_repo ? 'rgb(var(--color-primary))' : 'rgb(var(--color-muted-foreground))' 
                              }} />
                              <span className="text-sm font-medium">{repo.name}</span>
                              {!repo.is_git_repo && (
                                <span className="text-xs px-2 py-1 rounded" style={{ 
                                  backgroundColor: 'rgb(var(--color-muted))',
                                  color: 'rgb(var(--color-muted-foreground))'
                                }}>
                                  Not a Git repo
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs mb-2" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                            {repo.path}
                          </div>
                          {repo.is_git_repo && (
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                              <input
                                value={repo.default_branch}
                                onChange={(e) => updateWorkspaceRepoBranch(index, e.target.value)}
                                placeholder="main"
                                className="flex-1 h-8 rounded border px-2 text-sm"
                                style={{
                                  backgroundColor: 'rgb(var(--color-background))',
                                  borderColor: 'rgb(var(--color-border))',
                                  color: 'rgb(var(--color-foreground))'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isCreateMode && selectedProject && selectedProject.type === 'repository' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Worktrees</label>
                      <button
                        onClick={() => setShowCreateWorktreeDialog(true)}
                        className="px-3 py-1 text-sm font-medium rounded-md transition-all flex items-center gap-1"
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
                        <Plus className="w-3 h-3" />
                        Create Worktree
                      </button>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                      Manage Git worktrees for different branches
                    </p>
                    
                    {worktrees.length > 0 ? (
                      <div className="space-y-2">
                        {worktrees.map((worktree) => (
                          <div 
                            key={worktree.id} 
                            className="p-3 rounded border cursor-pointer transition-all group"
                            style={{ 
                              backgroundColor: 'rgb(var(--color-background))',
                              borderColor: 'rgb(var(--color-border))'
                            }}
                            onClick={() => selectWorktree(worktree.id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                              e.currentTarget.style.borderColor = 'rgb(var(--color-primary))';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgb(var(--color-background))';
                              e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <GitBranch className="w-4 h-4" style={{ color: 'rgb(var(--color-primary))' }} />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{getWorktreeName(worktree.path)}</span>
                                  <span className="text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                                    {worktree.branch}
                                  </span>
                                </div>
                                {worktree.has_uncommitted_changes && (
                                  <span className="text-xs px-2 py-1 rounded" style={{ 
                                    backgroundColor: 'rgb(var(--color-destructive))',
                                    color: 'rgb(var(--color-destructive-foreground))'
                                  }}>
                                    Uncommitted changes
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInEditor(worktree.path);
                                  }}
                                  className="p-1 rounded transition-all"
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
                                  title="Open in editor"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorktree(worktree);
                                  }}
                                  className="p-1 rounded transition-all"
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
                                  title="Delete worktree"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                                               style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                              </div>
                            </div>
                            <div className="text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                              {worktree.path}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No worktrees yet.</p>
                        <p className="text-xs mt-1">Create one to work on different branches simultaneously.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-md transition-all border"
                    style={{ 
                      backgroundColor: 'transparent',
                      color: 'rgb(var(--color-foreground))',
                      borderColor: 'rgb(var(--color-border))',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  {isCreateMode ? (
                    <button
                      className="px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2"
                      style={{ 
                        backgroundColor: !projectName || !projectPath ? 'rgb(var(--color-muted))' : 'rgb(var(--color-primary))',
                        color: !projectName || !projectPath ? 'rgb(var(--color-muted-foreground))' : 'rgb(var(--color-primary-foreground))',
                        cursor: !projectName || !projectPath ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (projectName && projectPath) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => {
                        if (projectName && projectPath) {
                          setCurrentStep(2);
                        }
                      }}
                      disabled={!projectName || !projectPath}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 text-sm font-medium rounded-md transition-all"
                      style={{ 
                        backgroundColor: !projectName ? 'rgb(var(--color-muted))' : 'rgb(var(--color-primary))',
                        color: !projectName ? 'rgb(var(--color-muted-foreground))' : 'rgb(var(--color-primary-foreground))',
                        cursor: !projectName ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (projectName) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={handleSave}
                      disabled={!projectName}
                    >
                      {saveButtonText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        )}
        
        {/* Terminal Settings Tab */}
        {((!isCreateMode && activeTab === 'terminal') || (isCreateMode && currentStep === 2)) && (
          <div className="space-y-6">
            <TerminalSettings 
              mode={isCreateMode ? 'create' : 'edit'}
              previewTerminals={isCreateMode ? previewTerminals : undefined}
              onUpdatePreviewTerminals={isCreateMode ? setPreviewTerminals : undefined}
            />
            
            {/* Save button for create mode step 2 */}
            {isCreateMode && (
              <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <button
                  className="px-4 py-2 text-sm font-medium rounded-md transition-all border"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: 'rgb(var(--color-foreground))',
                    borderColor: 'rgb(var(--color-border))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium rounded-md transition-all"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary))',
                    color: 'rgb(var(--color-primary-foreground))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={handleSave}
                >
                  Save Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedProject && (
        <>
          <CreateWorktreeDialog
            isOpen={showCreateWorktreeDialog}
            onClose={() => setShowCreateWorktreeDialog(false)}
            onSuccess={handleWorktreeCreated}
            projectId={selectedProject.id}
            projectPath={selectedProject.path}
            projectName={selectedProject.name}
          />
        </>
      )}
    </div>
  );
}
