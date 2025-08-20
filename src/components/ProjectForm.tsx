import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, FileCode2, GitBranch, Save, X, Trash2, Plus } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { invoke } from '@tauri-apps/api/core';

interface ProjectFormProps {
  mode: 'create' | 'edit';
}

export function ProjectForm({ mode }: ProjectFormProps) {
  const { getSelectedProject, addProject, updateProject, removeProject, selectProject } = useProjectStore();
  const selectedProject = mode === 'edit' ? getSelectedProject() : null;
  
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [projectType, setProjectType] = useState<'repository' | 'workspace'>('repository');

  // Initialize form with existing project data in edit mode
  useEffect(() => {
    if (mode === 'edit' && selectedProject) {
      setProjectName(selectedProject.name);
      setProjectPath(selectedProject.path);
      setDefaultBranch(selectedProject.defaultBranch || 'main');
      setProjectType(selectedProject.type);
    } else if (mode === 'create') {
      // Reset form for create mode
      setProjectName('');
      setProjectPath('');
      setDefaultBranch('main');
      setProjectType('repository');
    }
  }, [mode, selectedProject]);

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
          console.log('Git detection failed:', error);
          setProjectType('workspace');
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleSelectWorkspace = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Select Workspace File',
        filters: [
          { name: 'Workspace', extensions: ['code-workspace', 'json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (selected && typeof selected === 'string') {
        setProjectPath(selected);
        setProjectType('workspace');
        
        // Auto-detect project name from file
        const fileName = selected.split('/').pop()?.replace(/\.(code-workspace|json)$/, '') || 
                        selected.split('\\').pop()?.replace(/\.(code-workspace|json)$/, '') || '';
        if (!projectName) {
          setProjectName(fileName);
        }
      }
    } catch (error) {
      console.error('Failed to select workspace:', error);
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
            default_branch: projectType === 'repository' ? defaultBranch : null
          }
        });
        
        // Add to store
        addProject(result);
        
        // Reset form
        setProjectName('');
        setProjectPath('');
        setDefaultBranch('main');
        setProjectType('repository');
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
                  onClick={handleSelectWorkspace}
                >
                  <FileCode2 className="h-8 w-8" />
                  <span className="text-sm font-medium">Workspace File</span>
                  <span className="text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                    Import from VS Code workspace
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
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-md transition-all"
                    style={{ 
                      backgroundColor: !projectName || (!projectPath && isCreateMode) ? 'rgb(var(--color-muted))' : 'rgb(var(--color-primary))',
                      color: !projectName || (!projectPath && isCreateMode) ? 'rgb(var(--color-muted-foreground))' : 'rgb(var(--color-primary-foreground))',
                      cursor: !projectName || (!projectPath && isCreateMode) ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (projectName && (projectPath || !isCreateMode)) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={handleSave}
                    disabled={!projectName || (!projectPath && isCreateMode)}
                  >
                    {saveButtonText}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
