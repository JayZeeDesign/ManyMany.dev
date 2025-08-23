import React from 'react';
import { Plus, FolderGit2, ChevronRight, ChevronDown, GitBranch, Settings } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const {
    projects,
    selectedProjectId,
    selectedWorktreeId,
    selectProject,
    selectWorktree,
    setShowCreateWorktreeDialog,
  } = useProjectStore();

  // Helper function to extract worktree name from path
  const getWorktreeName = (worktreePath: string) => {
    const pathParts = worktreePath.split('/');
    return pathParts[pathParts.length - 1] || 'Unnamed';
  };
  
  const sidebarCollapsed = false; // TODO: Add to a UI store later

  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set());

  // Initialize expanded projects with all project IDs (expand all by default)
  React.useEffect(() => {
    const allProjectIds = new Set(projects.map(p => p.id));
    setExpandedProjects(allProjectIds);
  }, [projects]);

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getProjectWorktrees = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.worktrees || [];
  };

  if (sidebarCollapsed) {
    return (
      <div className="sidebar w-12 flex flex-col items-center py-4" style={{ 
        backgroundColor: 'rgb(var(--color-sidebar))', 
        borderRight: '1px solid rgb(var(--color-sidebar-border))' 
      }}>
        <button className="p-2 rounded-md" style={{ color: 'rgb(var(--color-sidebar-foreground))' }}>
          <FolderGit2 className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar w-64 flex flex-col h-full flex-shrink-0" style={{ 
      backgroundColor: 'rgb(var(--color-sidebar))', 
      borderRight: '1px solid rgb(var(--color-sidebar-border))' 
    }}>
      {/* Header */}
      <div className="h-10 px-3 flex items-center flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--color-sidebar-border))' }}>
        <h2 className="font-medium text-xs uppercase tracking-wide" style={{ color: 'rgb(var(--color-sidebar-foreground))' }}>Projects</h2>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>No projects yet.</p>
            <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-muted-foreground))' }}>Import a project to get started.</p>
          </div>
        ) : (
          <div className="py-1">
            {projects.map((project) => {
              const projectWorktrees = getProjectWorktrees(project.id);
              const isExpanded = expandedProjects.has(project.id);
              const isSelected = selectedProjectId === project.id && !selectedWorktreeId;

              return (
                <div key={project.id}>
                  {/* Project Item */}
                  <div
                    className={cn(
                      "flex items-center px-3 py-1.5 cursor-pointer transition-all group"
                    )}
                    style={{
                      backgroundColor: isSelected ? 'rgb(var(--color-primary) / 0.15)' : 'transparent',
                      color: isSelected ? 'rgb(var(--color-primary))' : 'rgb(var(--color-sidebar-foreground))',
                      borderRadius: isSelected ? '8px' : '0px',
                      marginLeft: isSelected ? '6px' : '0px',
                      marginRight: isSelected ? '6px' : '0px',
                      fontWeight: isSelected ? '600' : '400'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-sidebar-accent))';
                        e.currentTarget.style.color = 'rgb(var(--color-sidebar-accent-foreground))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'rgb(var(--color-sidebar-foreground))';
                      }
                    }}
                    onClick={() => {
                      selectProject(project.id);
                    }}
                  >
                    <button
                      className="p-0.5 mr-1 opacity-70 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectExpansion(project.id);
                      }}
                    >
                      {projectWorktrees.length > 0 && (
                        isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )
                      )}
                      {projectWorktrees.length === 0 && (
                        <div className="w-3 h-3" />
                      )}
                    </button>
                    <FolderGit2 className="w-4 h-4 mr-2 opacity-70" />
                    <span className="text-sm flex-1 truncate">{project.name}</span>
                    <button
                      className="p-0.5 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity rounded"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(var(--color-sidebar-accent), 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open project settings
                      }}
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Worktrees */}
                  {isExpanded && (
                    <div className="ml-6">
                      {projectWorktrees.map((worktree) => {
                        return (
                          <div
                            key={worktree.id}
                            className="flex items-center px-3 py-1 cursor-pointer transition-all text-sm"
                            style={{
                              backgroundColor: selectedWorktreeId === worktree.id ? 'rgb(var(--color-primary) / 0.1)' : 'transparent',
                              color: selectedWorktreeId === worktree.id ? 'rgb(var(--color-primary))' : 'rgb(var(--color-sidebar-foreground))',
                              borderRadius: selectedWorktreeId === worktree.id ? '6px' : '0px',
                              marginLeft: selectedWorktreeId === worktree.id ? '4px' : '0px',
                              marginRight: selectedWorktreeId === worktree.id ? '4px' : '0px',
                              fontWeight: selectedWorktreeId === worktree.id ? '500' : '400'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedWorktreeId !== worktree.id) {
                                e.currentTarget.style.backgroundColor = 'rgb(var(--color-sidebar-accent))';
                                e.currentTarget.style.color = 'rgb(var(--color-sidebar-accent-foreground))';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedWorktreeId !== worktree.id) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'rgb(var(--color-sidebar-foreground))';
                              }
                            }}
                            onClick={() => {
                              // First select the project to make sure we have the right context
                              selectProject(project.id);
                              // Then select the worktree
                              selectWorktree(worktree.id);
                            }}
                          >
                            <GitBranch className="w-3 h-3 mr-2 opacity-70" />
                            <span className="truncate flex-1" title={`${getWorktreeName(worktree.path)} (${worktree.branch})`}>
                              {getWorktreeName(worktree.path)}
                            </span>
                          </div>
                        );
                      })}
                      <button
                        className="w-full flex items-center px-3 py-1 text-sm transition-all group"
                        style={{ 
                          color: 'rgb(var(--color-muted-foreground))'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'rgb(var(--color-foreground))';
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-sidebar-accent))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => {
                          // Select the project and show the dialog
                          selectProject(project.id);
                          setShowCreateWorktreeDialog(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-2 transition-transform group-hover:rotate-90" />
                        New Worktree
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgb(var(--color-sidebar-border))' }}>
        <button
          className="w-full px-3 py-2 text-sm rounded-md transition-all flex items-center justify-center group"
          style={{ 
            backgroundColor: 'rgb(var(--color-secondary))',
            color: 'rgb(var(--color-secondary-foreground))',
            border: '1px solid rgb(var(--color-border))',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary))';
            e.currentTarget.style.color = 'rgb(var(--color-primary-foreground))';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-secondary))';
            e.currentTarget.style.color = 'rgb(var(--color-secondary-foreground))';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onClick={() => selectProject(null)}
        >
          <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" />
          Import New Project
        </button>
      </div>
    </div>
  );
};