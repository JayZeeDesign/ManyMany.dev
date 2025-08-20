import React from 'react';
import { Plus, FolderGit2, ChevronRight, ChevronDown, GitBranch, Settings } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const Sidebar: React.FC = () => {
  const {
    projects,
    worktrees,
    selectedProjectId,
    selectedWorktreeId,
    selectProject,
    selectWorktree,
    sidebarCollapsed,
  } = useAppStore();

  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set());

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
    return worktrees.filter(w => w.projectId === projectId);
  };

  if (sidebarCollapsed) {
    return (
      <div className="sidebar w-12 flex flex-col items-center py-4" style={{ 
        backgroundColor: 'rgb(var(--color-sidebar))', 
        borderRight: '1px solid rgb(var(--color-sidebar-border))' 
      }}>
        <Button variant="ghost" size="icon" style={{ color: 'rgb(var(--color-sidebar-foreground))' }}>
          <FolderGit2 className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="sidebar w-64 flex flex-col h-full" style={{ 
      backgroundColor: 'rgb(var(--color-sidebar))', 
      borderRight: '1px solid rgb(var(--color-sidebar-border))' 
    }}>
      {/* Header - Reduced padding to better align with tab bar */}
      <div className="h-10 px-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--color-sidebar-border))' }}>
        <h2 className="font-medium text-xs uppercase tracking-wide" style={{ color: 'rgb(var(--color-sidebar-foreground))' }}>Projects</h2>
        <button
          className="p-1 rounded hover:bg-opacity-10 transition-all"
          style={{ 
            color: 'rgb(var(--color-sidebar-foreground))',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(var(--color-sidebar-accent), 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onClick={() => {/* TODO: Open add project dialog */}}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-muted-foreground))' }}>No projects yet.</p>
            <button
              className="w-full px-3 py-1.5 text-sm rounded transition-all flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgb(var(--color-secondary))',
                color: 'rgb(var(--color-secondary-foreground))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-secondary) / 0.8)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-secondary))';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => {/* TODO: Open add project dialog */}}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </button>
          </div>
        ) : (
          <div className="py-1">
            {projects.map((project) => {
              const projectWorktrees = getProjectWorktrees(project.id);
              const isExpanded = expandedProjects.has(project.id);
              const isSelected = selectedProjectId === project.id;

              return (
                <div key={project.id}>
                  {/* Project Item */}
                  <div
                    className={cn(
                      "flex items-center px-3 py-1.5 cursor-pointer transition-all group"
                    )}
                    style={{
                      backgroundColor: isSelected ? 'rgb(var(--color-sidebar-primary))' : 'transparent',
                      color: isSelected ? 'rgb(var(--color-sidebar-primary-foreground))' : 'rgb(var(--color-sidebar-foreground))'
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
                      if (projectWorktrees.length > 0) {
                        toggleProjectExpansion(project.id);
                      }
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
                        const isWorktreeSelected = selectedWorktreeId === worktree.id;
                        return (
                          <div
                            key={worktree.id}
                            className="flex items-center px-3 py-1 cursor-pointer transition-all text-sm"
                            style={{
                              backgroundColor: isWorktreeSelected ? 'rgb(var(--color-sidebar-primary))' : 'transparent',
                              color: isWorktreeSelected ? 'rgb(var(--color-sidebar-primary-foreground))' : 'rgb(var(--color-sidebar-foreground))'
                            }}
                            onMouseEnter={(e) => {
                              if (!isWorktreeSelected) {
                                e.currentTarget.style.backgroundColor = 'rgb(var(--color-sidebar-accent))';
                                e.currentTarget.style.color = 'rgb(var(--color-sidebar-accent-foreground))';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isWorktreeSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'rgb(var(--color-sidebar-foreground))';
                              }
                            }}
                            onClick={() => selectWorktree(worktree.id)}
                          >
                            <GitBranch className="w-3 h-3 mr-2 opacity-70" />
                            <span className="truncate flex-1">{worktree.branch}</span>
                            {worktree.hasUncommittedChanges && (
                              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                            )}
                          </div>
                        );
                      })}
                      <button
                        className="w-full flex items-center px-3 py-1 text-sm transition-all"
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
                        onClick={() => {/* TODO: Create new worktree */}}
                      >
                        <Plus className="w-3 h-3 mr-2" />
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
      <div className="p-3" style={{ borderTop: '1px solid rgb(var(--color-sidebar-border))' }}>
        <div className="text-xs" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
          Worktree Studio
        </div>
      </div>
    </div>
  );
};