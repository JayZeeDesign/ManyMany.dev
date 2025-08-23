import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DefaultTerminalConfig } from './settingsStore';

const DEFAULT_PROJECT_TERMINALS: DefaultTerminalConfig[] = [
  {
    id: 'default-1',
    name: 'Claude code',
    command: 'claude',
    enabled: true,
  },
];

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'repository' | 'workspace';
  defaultBranch?: string;
  worktrees?: Worktree[];
  createdAt: Date;
  lastOpenedAt?: Date;
  defaultTerminals?: DefaultTerminalConfig[]; // Project-specific terminal settings
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
  showFileChangesPanel: boolean;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  removeProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  selectWorktree: (worktreeId: string | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  getSelectedProject: () => Project | undefined;
  getSelectedWorktree: () => Worktree | undefined;
  setShowCreateWorktreeDialog: (show: boolean) => void;
  setShowFileChangesPanel: (show: boolean) => void;
  toggleFileChangesPanel: () => void;
  // Project-specific terminal settings
  getProjectTerminalSettings: (projectId: string) => DefaultTerminalConfig[];
  updateProjectTerminalSettings: (projectId: string, terminals: DefaultTerminalConfig[]) => void;
  addProjectTerminal: (projectId: string) => void;
  removeProjectTerminal: (projectId: string, terminalId: string) => void;
  updateProjectTerminal: (projectId: string, terminalId: string, updates: Partial<DefaultTerminalConfig>) => void;
  resetProjectTerminalsToDefaults: (projectId: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedProjectId: null,
      selectedWorktreeId: null,
      showCreateWorktreeDialog: false,
      showFileChangesPanel: false,
      
      addProject: (projectData: any) => {
        const project: Project = {
          id: projectData.id,
          name: projectData.name,
          path: projectData.path,
          type: projectData.project_type || projectData.type,
          defaultBranch: projectData.default_branch || projectData.defaultBranch,
          worktrees: projectData.worktrees || [],
          createdAt: new Date(projectData.created_at || projectData.createdAt),
          lastOpenedAt: new Date(),
          defaultTerminals: [...DEFAULT_PROJECT_TERMINALS] // Initialize with default terminal settings
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
      },

      setShowFileChangesPanel: (show: boolean) => {
        set({ showFileChangesPanel: show });
      },

      toggleFileChangesPanel: () => {
        set((state) => ({ showFileChangesPanel: !state.showFileChangesPanel }));
      },

      // Project-specific terminal settings methods
      getProjectTerminalSettings: (projectId: string) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        return project?.defaultTerminals || DEFAULT_PROJECT_TERMINALS;
      },

      updateProjectTerminalSettings: (projectId: string, terminals: DefaultTerminalConfig[]) => {
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === projectId ? { ...p, defaultTerminals: terminals } : p
          )
        }));
      },

      addProjectTerminal: (projectId: string) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        const currentTerminals = project?.defaultTerminals || DEFAULT_PROJECT_TERMINALS;
        
        const newTerminal: DefaultTerminalConfig = {
          id: `default-${Date.now()}`,
          name: `Terminal ${currentTerminals.length + 1}`,
          command: '',
          enabled: true,
        };

        const updatedTerminals = [...currentTerminals, newTerminal];
        
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === projectId ? { ...p, defaultTerminals: updatedTerminals } : p
          )
        }));
      },

      removeProjectTerminal: (projectId: string, terminalId: string) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        const currentTerminals = project?.defaultTerminals || DEFAULT_PROJECT_TERMINALS;
        
        const updatedTerminals = currentTerminals.filter(t => t.id !== terminalId);
        
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === projectId ? { ...p, defaultTerminals: updatedTerminals } : p
          )
        }));
      },

      updateProjectTerminal: (projectId: string, terminalId: string, updates: Partial<DefaultTerminalConfig>) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        const currentTerminals = project?.defaultTerminals || DEFAULT_PROJECT_TERMINALS;
        
        const updatedTerminals = currentTerminals.map(t => 
          t.id === terminalId ? { ...t, ...updates } : t
        );
        
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === projectId ? { ...p, defaultTerminals: updatedTerminals } : p
          )
        }));
      },

      resetProjectTerminalsToDefaults: (projectId: string) => {
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === projectId ? { ...p, defaultTerminals: DEFAULT_PROJECT_TERMINALS } : p
          )
        }));
      }
    }),
    {
      name: 'project-storage',
    }
  )
);