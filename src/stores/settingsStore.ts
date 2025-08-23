import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DefaultTerminalConfig {
  id: string;
  name: string;
  command: string;
  enabled: boolean;
}

interface SettingsStore {
  // Default terminal configurations
  defaultTerminals: DefaultTerminalConfig[];
  
  // Actions
  updateDefaultTerminals: (terminals: DefaultTerminalConfig[]) => void;
  addDefaultTerminal: () => void;
  removeDefaultTerminal: (id: string) => void;
  updateDefaultTerminal: (id: string, updates: Partial<DefaultTerminalConfig>) => void;
  resetToDefaults: () => void;
}

const DEFAULT_TERMINALS: DefaultTerminalConfig[] = [
  {
    id: 'default-1',
    name: 'Claude code',
    command: 'claude',
    enabled: true,
  },
];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      defaultTerminals: DEFAULT_TERMINALS,

      updateDefaultTerminals: (terminals) => {
        set({ defaultTerminals: terminals });
      },

      addDefaultTerminal: () => {
        const { defaultTerminals } = get();
        const newTerminal: DefaultTerminalConfig = {
          id: `default-${Date.now()}`,
          name: `Terminal ${defaultTerminals.length + 1}`,
          command: '',
          enabled: true,
        };
        set({ 
          defaultTerminals: [...defaultTerminals, newTerminal] 
        });
      },

      removeDefaultTerminal: (id) => {
        const { defaultTerminals } = get();
        set({ 
          defaultTerminals: defaultTerminals.filter(t => t.id !== id) 
        });
      },

      updateDefaultTerminal: (id, updates) => {
        const { defaultTerminals } = get();
        set({
          defaultTerminals: defaultTerminals.map(t => 
            t.id === id ? { ...t, ...updates } : t
          )
        });
      },

      resetToDefaults: () => {
        set({ defaultTerminals: DEFAULT_TERMINALS });
      },
    }),
    {
      name: 'settings-storage',
    }
  )
);