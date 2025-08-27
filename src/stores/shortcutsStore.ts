import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShortcutConfig {
  id: string;
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: string;
}

export const getDefaultShortcuts = (): ShortcutConfig[] => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? { metaKey: true } : { ctrlKey: true };
  
  return [
    {
      id: 'next-worktree',
      key: 'ArrowRight',
      ...modifier,
      description: 'Next worktree',
      action: 'navigateToNextWorktree',
    },
    {
      id: 'prev-worktree',
      key: 'ArrowLeft',
      ...modifier,
      description: 'Previous worktree',
      action: 'navigateToPreviousWorktree',
    },
    {
      id: 'next-project',
      key: 'ArrowDown',
      ...modifier,
      description: 'Next project',
      action: 'navigateToNextProject',
    },
    {
      id: 'prev-project',
      key: 'ArrowUp',
      ...modifier,
      description: 'Previous project',
      action: 'navigateToPreviousProject',
    },
    {
      id: 'show-help',
      key: '/',
      ...modifier,
      description: 'Show keyboard shortcuts',
      action: 'showHelp',
    },
    // Worktree numbers 1-9
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `worktree-${i + 1}`,
      key: (i + 1).toString(),
      ...modifier,
      description: `Switch to worktree ${i + 1}`,
      action: `navigateToWorktreeByNumber:${i + 1}`,
    })),
  ];
};

interface ShortcutsStore {
  shortcuts: ShortcutConfig[];
  enabled: boolean;
  
  // Actions
  updateShortcut: (id: string, config: Partial<ShortcutConfig>) => void;
  resetToDefaults: () => void;
  toggleEnabled: () => void;
  setEnabled: (enabled: boolean) => void;
  getShortcut: (id: string) => ShortcutConfig | undefined;
}

export const useShortcutsStore = create<ShortcutsStore>()(
  persist(
    (set, get) => ({
      shortcuts: getDefaultShortcuts(),
      enabled: true,
      
      updateShortcut: (id: string, config: Partial<ShortcutConfig>) => {
        set((state) => ({
          shortcuts: state.shortcuts.map(shortcut =>
            shortcut.id === id ? { ...shortcut, ...config } : shortcut
          ),
        }));
      },
      
      resetToDefaults: () => {
        set({ shortcuts: getDefaultShortcuts() });
      },
      
      toggleEnabled: () => {
        set((state) => ({ enabled: !state.enabled }));
      },
      
      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },
      
      getShortcut: (id: string) => {
        const state = get();
        return state.shortcuts.find(shortcut => shortcut.id === id);
      },
    }),
    {
      name: 'keyboard-shortcuts-storage',
      version: 1,
    }
  )
);