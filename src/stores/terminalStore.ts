import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TerminalSession {
  id: string;
  name: string;
  worktreeId: string;
  workingDirectory: string;
  lastActiveTime: number;
  isActive: boolean;
  backendTerminalId?: string; // Only set while terminal is running
}

interface TerminalStore {
  // All terminal sessions across all worktrees
  terminals: TerminalSession[];
  
  // Active terminal per worktree
  activeTerminalByWorktree: Record<string, string | null>;
  
  // Actions
  createTerminal: (terminal: Omit<TerminalSession, 'id' | 'lastActiveTime' | 'isActive'>) => TerminalSession;
  closeTerminal: (terminalId: string) => void;
  renameTerminal: (terminalId: string, newName: string) => void;
  setActiveTerminal: (worktreeId: string, terminalId: string | null) => void;
  setBackendTerminalId: (terminalId: string, backendId: string) => void;
  
  // Getters
  getTerminalsForWorktree: (worktreeId: string) => TerminalSession[];
  getActiveTerminalForWorktree: (worktreeId: string) => TerminalSession | undefined;
  getTerminalById: (terminalId: string) => TerminalSession | undefined;
  
  // Restoration
  restoreTerminalSessions: () => void;
  clearAllTerminals: () => void;
}

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      terminals: [],
      activeTerminalByWorktree: {},

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
        // This will be called on app startup to restore terminals
        // Clear backend terminal IDs since they're no longer valid after app restart
        set((state) => ({
          terminals: state.terminals.map(t => ({
            ...t,
            backendTerminalId: undefined, // Clear old backend IDs
            isActive: false, // Will be set when terminal is recreated
          })),
        }));
      },

      clearAllTerminals: () => {
        set({
          terminals: [],
          activeTerminalByWorktree: {},
        });
      },
    }),
    {
      name: 'terminal-storage',
      // Only persist the terminal metadata, not the backend IDs
      partialize: (state) => ({
        terminals: state.terminals.map(t => ({
          ...t,
          backendTerminalId: undefined, // Don't persist backend IDs
        })),
        activeTerminalByWorktree: state.activeTerminalByWorktree,
      }),
    }
  )
);