import { create } from 'zustand';

export interface TerminalSession {
  id: string;
  name: string;
  worktreeId: string;
  workingDirectory: string;
  lastActiveTime: number;
  isActive: boolean;
  backendTerminalId?: string; // Only set while terminal is running
  autoCommand?: string; // Command to auto-execute when terminal is created
}

interface TerminalStore {
  // All terminal sessions across all worktrees
  terminals: TerminalSession[];
  
  // Active terminal per worktree
  activeTerminalByWorktree: Record<string, string | null>;
  
  // Focus management
  terminalRefs: Record<string, { focus: () => void } | null>;
  
  // Actions
  createTerminal: (terminal: Omit<TerminalSession, 'id' | 'lastActiveTime' | 'isActive'>) => TerminalSession;
  closeTerminal: (terminalId: string) => void;
  renameTerminal: (terminalId: string, newName: string) => void;
  setActiveTerminal: (worktreeId: string, terminalId: string | null) => void;
  setBackendTerminalId: (terminalId: string, backendId: string) => void;
  
  // Focus management
  registerTerminalRef: (terminalId: string, ref: { focus: () => void } | null) => void;
  focusActiveTerminal: (worktreeId: string) => Promise<boolean>;
  requestTerminalFocus: (terminalId: string) => Promise<boolean>;
  
  // Getters
  getTerminalsForWorktree: (worktreeId: string) => TerminalSession[];
  getActiveTerminalForWorktree: (worktreeId: string) => TerminalSession | undefined;
  getTerminalById: (terminalId: string) => TerminalSession | undefined;
  
  // Restoration
  restoreTerminalSessions: () => void;
  clearAllTerminals: () => void;
}

export const useTerminalStore = create<TerminalStore>()((set, get) => ({
  terminals: [],
  activeTerminalByWorktree: {},
  terminalRefs: {},

  createTerminal: (terminalData) => {
    const terminal: TerminalSession = {
      id: `terminal-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      ...terminalData,
      lastActiveTime: Date.now(),
      isActive: true,
    };

    set((state) => ({
      terminals: [...state.terminals, terminal],
      activeTerminalByWorktree: {
        ...state.activeTerminalByWorktree,
        [terminal.worktreeId]: terminal.id,
      },
    }));

    return terminal;
  },

  closeTerminal: (terminalId) => {
    const state = get();
    const terminal = state.terminals.find(t => t.id === terminalId);
    
    if (terminal) {
      // Remove from terminals list
      const remainingTerminals = state.terminals.filter(t => t.id !== terminalId);
      
      // Update active terminal for this worktree if it was the active one
      const newActiveTerminalByWorktree = { ...state.activeTerminalByWorktree };
      if (newActiveTerminalByWorktree[terminal.worktreeId] === terminalId) {
        // Find another terminal in the same worktree to make active
        const worktreeTerminals = remainingTerminals.filter(t => t.worktreeId === terminal.worktreeId);
        newActiveTerminalByWorktree[terminal.worktreeId] = worktreeTerminals.length > 0 
          ? worktreeTerminals[0].id 
          : null;
      }

      set({
        terminals: remainingTerminals,
        activeTerminalByWorktree: newActiveTerminalByWorktree,
      });
    }
  },

  renameTerminal: (terminalId, newName) => {
    set((state) => ({
      terminals: state.terminals.map(t =>
        t.id === terminalId
          ? { ...t, name: newName, lastActiveTime: Date.now() }
          : t
      ),
    }));
  },

  setActiveTerminal: (worktreeId, terminalId) => {
    set((state) => {
      const updatedTerminals = state.terminals.map(t => {
        if (t.worktreeId === worktreeId) {
          return { ...t, isActive: t.id === terminalId, lastActiveTime: t.id === terminalId ? Date.now() : t.lastActiveTime };
        }
        return t;
      });

      return {
        terminals: updatedTerminals,
        activeTerminalByWorktree: {
          ...state.activeTerminalByWorktree,
          [worktreeId]: terminalId,
        },
      };
    });
  },

  setBackendTerminalId: (terminalId, backendId) => {
    set((state) => ({
      terminals: state.terminals.map(t =>
        t.id === terminalId
          ? { ...t, backendTerminalId: backendId }
          : t
      ),
    }));
  },

  getTerminalsForWorktree: (worktreeId) => {
    const state = get();
    return state.terminals.filter(t => t.worktreeId === worktreeId);
  },

  getActiveTerminalForWorktree: (worktreeId) => {
    const state = get();
    const activeTerminalId = state.activeTerminalByWorktree[worktreeId];
    return activeTerminalId ? state.terminals.find(t => t.id === activeTerminalId) : undefined;
  },

  getTerminalById: (terminalId) => {
    const state = get();
    return state.terminals.find(t => t.id === terminalId);
  },

  restoreTerminalSessions: () => {
    // No longer needed - terminals don't persist across app restarts
    console.log('[TerminalStore] restoreTerminalSessions called but terminals are now session-only');
  },

  clearAllTerminals: () => {
    set({
      terminals: [],
      activeTerminalByWorktree: {},
      terminalRefs: {},
    });
  },

  // Focus management methods
  registerTerminalRef: (terminalId, ref) => {
    set((state) => ({
      terminalRefs: {
        ...state.terminalRefs,
        [terminalId]: ref,
      },
    }));
  },

  focusActiveTerminal: async (worktreeId) => {
    try {
      const state = get();
      const activeTerminalId = state.activeTerminalByWorktree[worktreeId];
      
      if (!activeTerminalId) {
        console.log(`[TerminalStore] No active terminal for worktree: ${worktreeId}`);
        return false;
      }

      const terminalRef = state.terminalRefs[activeTerminalId];
      if (!terminalRef) {
        console.log(`[TerminalStore] No terminal ref found for: ${activeTerminalId}`);
        return false;
      }

      // Focus with a delay to ensure terminal is rendered
      await new Promise(resolve => setTimeout(resolve, 150));
      terminalRef.focus();
      console.log(`[TerminalStore] Focused terminal: ${activeTerminalId}`);
      return true;
    } catch (error) {
      console.error('Failed to focus active terminal:', error);
      return false;
    }
  },

  requestTerminalFocus: async (terminalId) => {
    try {
      const state = get();
      const terminalRef = state.terminalRefs[terminalId];
      
      if (!terminalRef) {
        console.log(`[TerminalStore] No terminal ref found for: ${terminalId}`);
        return false;
      }

      // Focus with a delay to ensure terminal is rendered
      await new Promise(resolve => setTimeout(resolve, 150));
      terminalRef.focus();
      console.log(`[TerminalStore] Focused terminal: ${terminalId}`);
      return true;
    } catch (error) {
      console.error('Failed to focus terminal:', error);
      return false;
    }
  },
}));