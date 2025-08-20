import { create } from 'zustand';
import { Project, Worktree, Terminal, GitStatus } from '../types';

interface AppState {
  // Projects
  projects: Project[];
  selectedProjectId: string | null;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  selectProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // Worktrees
  worktrees: Worktree[];
  selectedWorktreeId: string | null;
  addWorktree: (worktree: Worktree) => void;
  removeWorktree: (id: string) => void;
  selectWorktree: (id: string) => void;
  updateWorktree: (id: string, updates: Partial<Worktree>) => void;

  // Terminals
  terminals: Terminal[];
  activeTerminalId: string | null;
  addTerminal: (terminal: Terminal) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;

  // Git Status
  gitStatus: GitStatus | null;
  setGitStatus: (status: GitStatus | null) => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  showGitPanel: boolean;
  toggleGitPanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Projects
  projects: [],
  selectedProjectId: null,
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    })),
  selectProject: (id) => set({ selectedProjectId: id }),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  // Worktrees
  worktrees: [],
  selectedWorktreeId: null,
  addWorktree: (worktree) =>
    set((state) => ({ worktrees: [...state.worktrees, worktree] })),
  removeWorktree: (id) =>
    set((state) => ({
      worktrees: state.worktrees.filter((w) => w.id !== id),
      selectedWorktreeId: state.selectedWorktreeId === id ? null : state.selectedWorktreeId,
    })),
  selectWorktree: (id) => set({ selectedWorktreeId: id }),
  updateWorktree: (id, updates) =>
    set((state) => ({
      worktrees: state.worktrees.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),

  // Terminals
  terminals: [],
  activeTerminalId: null,
  addTerminal: (terminal) =>
    set((state) => ({ terminals: [...state.terminals, terminal] })),
  removeTerminal: (id) =>
    set((state) => ({
      terminals: state.terminals.filter((t) => t.id !== id),
      activeTerminalId: state.activeTerminalId === id ? null : state.activeTerminalId,
    })),
  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  // Git Status
  gitStatus: null,
  setGitStatus: (status) => set({ gitStatus: status }),

  // UI State
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  showGitPanel: true,
  toggleGitPanel: () =>
    set((state) => ({ showGitPanel: !state.showGitPanel })),
}));