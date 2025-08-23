import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'repository' | 'workspace';
  defaultBranch?: string;
  worktrees?: Worktree[];
  createdAt: Date;
  lastOpenedAt?: Date;
}

export interface Worktree {
  id: string;
  branch: string;
  path: string;
  createdAt: Date;
}

interface ProjectStore {
  projects: Project[];
  selectedProjectId: string | null;
  selectedWorktreeId: string | null;
  showCreateWorktreeDialog: boolean;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  removeProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  selectWorktree: (worktreeId: string | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  getSelectedProject: () => Project | undefined;
  getSelectedWorktree: () => Worktree | undefined;
  setShowCreateWorktreeDialog: (show: boolean) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedProjectId: null,
      selectedWorktreeId: null,
      showCreateWorktreeDialog: false,
      
      addProject: (projectData: any) => {
        const project: Project = {
          id: projectData.id,
          name: projectData.name,
          path: projectData.path,
          type: projectData.project_type || projectData.type,
          defaultBranch: projectData.default_branch || projectData.defaultBranch,
          worktrees: projectData.worktrees || [],
          createdAt: new Date(projectData.created_at || projectData.createdAt),
          lastOpenedAt: new Date()
        };
        set((state) => ({
          projects: [...state.projects, project]
        }));
      },
      
      removeProject: (id) => {
        set((state) => ({
          projects: state.projects.filter(p => p.id !== id),
          selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
        }));
      },
      
      selectProject: (id) => {
        set({ selectedProjectId: id, selectedWorktreeId: null });
        if (id) {
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === id 
                ? { ...p, lastOpenedAt: new Date() }
                : p
            )
          }));
        }
      },
      
      selectWorktree: (worktreeId) => {
        set({ selectedWorktreeId: worktreeId });
      },
      
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === id ? { ...p, ...updates } : p
          )
        }));
      },
      
      getSelectedProject: () => {
        const state = get();
        return state.projects.find(p => p.id === state.selectedProjectId);
      },
      
      getSelectedWorktree: () => {
        const state = get();
        const project = state.projects.find(p => p.id === state.selectedProjectId);
        if (!project || !project.worktrees) return undefined;
        return project.worktrees.find(w => w.id === state.selectedWorktreeId);
      },

      setShowCreateWorktreeDialog: (show: boolean) => {
        set({ showCreateWorktreeDialog: show });
      }
    }),
    {
      name: 'project-storage',
    }
  )
);