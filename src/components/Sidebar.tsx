import React from 'react';
import { Plus, FolderGit2, ChevronRight, ChevronDown, GitBranch, Settings } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { cn } from '../utils/cn';

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
      <div className="sidebar w-12 bg-[#252526] border-r border-[#3e3e42] flex flex-col items-center py-4">
        <button className="p-2 hover:bg-[#2a2d2e] rounded-md">
          <FolderGit2 className="w-5 h-5 text-[#cccccc]" />
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar w-64 bg-[#252526] border-r border-[#3e3e42] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#3e3e42] flex items-center justify-between">
        <h2 className="font-normal text-xs uppercase tracking-wide text-[#cccccc]">Projects</h2>
        <button
          className="p-1 hover:bg-[#2a2d2e] rounded-sm transition-colors"
          onClick={() => {/* TODO: Open add project dialog */}}
        >
          <Plus className="w-4 h-4 text-[#cccccc]" />
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-4 text-center text-[#969696] text-sm">
            No projects yet.
            <button
              className="mt-3 w-full px-3 py-1.5 bg-[#0e639c] text-white text-sm rounded hover:bg-[#1177bb] transition-colors"
              onClick={() => {/* TODO: Open add project dialog */}}
            >
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
                      "flex items-center px-3 py-1 cursor-pointer hover:bg-[#2a2d2e] transition-colors",
                      isSelected && "bg-[#094771]"
                    )}
                    onClick={() => {
                      selectProject(project.id);
                      if (projectWorktrees.length > 0) {
                        toggleProjectExpansion(project.id);
                      }
                    }}
                  >
                    <button
                      className="p-0.5 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectExpansion(project.id);
                      }}
                    >
                      {projectWorktrees.length > 0 && (
                        isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-[#cccccc]" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-[#cccccc]" />
                        )
                      )}
                      {projectWorktrees.length === 0 && (
                        <div className="w-3 h-3" />
                      )}
                    </button>
                    <FolderGit2 className="w-4 h-4 mr-2 text-[#c5c5c5]" />
                    <span className="text-sm flex-1 truncate text-[#cccccc]">{project.name}</span>
                    <button
                      className="p-0.5 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open project settings
                      }}
                    >
                      <Settings className="w-3 h-3 text-[#cccccc]" />
                    </button>
                  </div>

                  {/* Worktrees */}
                  {isExpanded && (
                    <div className="ml-5">
                      {projectWorktrees.map((worktree) => {
                        const isWorktreeSelected = selectedWorktreeId === worktree.id;
                        return (
                          <div
                            key={worktree.id}
                            className={cn(
                              "flex items-center px-3 py-0.5 cursor-pointer hover:bg-[#2a2d2e] transition-colors text-sm",
                              isWorktreeSelected && "bg-[#094771]"
                            )}
                            onClick={() => selectWorktree(worktree.id)}
                          >
                            <GitBranch className="w-3 h-3 mr-2 text-[#c5c5c5]" />
                            <span className="truncate text-[#cccccc]">{worktree.branch}</span>
                            {worktree.hasUncommittedChanges && (
                              <div className="w-1.5 h-1.5 bg-[#ffd33d] rounded-full ml-auto" />
                            )}
                          </div>
                        );
                      })}
                      <button
                        className="flex items-center px-3 py-0.5 w-full text-sm text-[#969696] hover:text-[#cccccc] hover:bg-[#2a2d2e] transition-colors"
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
      <div className="p-3 border-t border-[#3e3e42]">
        <div className="text-xs text-[#969696]">
          Worktree Studio
        </div>
      </div>
    </div>
  );
};