import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppSettings {
  // General app preferences
  theme: 'light' | 'dark' | 'system';
  showUpdateNotifications: boolean;
  autoCheckForUpdates: boolean;
  
  // UI preferences
  sidebarCollapsed: boolean;
  showFileChangesPanel: boolean;
  
  // Navigation preferences
  autoFocusTerminalOnNavigation: boolean;
  
  // Terminal preferences
  defaultShell: string;
  terminalFontSize: number;
  terminalFontFamily: string;
}

interface AppSettingsStore {
  settings: AppSettings;
  
  // Actions
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  showUpdateNotifications: true,
  autoCheckForUpdates: true,
  sidebarCollapsed: false,
  showFileChangesPanel: false,
  autoFocusTerminalOnNavigation: true,
  defaultShell: '/bin/zsh',
  terminalFontSize: 14,
  terminalFontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
};

export const useAppSettingsStore = create<AppSettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        }));
      },
      
      resetToDefaults: () => {
        set({ settings: { ...DEFAULT_SETTINGS } });
      },
      
      exportSettings: () => {
        const { settings } = get();
        return JSON.stringify(settings, null, 2);
      },
      
      importSettings: (settingsJson: string) => {
        try {
          const importedSettings = JSON.parse(settingsJson);
          
          // Validate settings object
          if (typeof importedSettings !== 'object' || importedSettings === null) {
            return false;
          }
          
          // Merge with defaults to ensure all required properties exist
          const validSettings = { ...DEFAULT_SETTINGS, ...importedSettings };
          
          set({ settings: validSettings });
          return true;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },
    }),
    {
      name: 'app-settings-storage',
      version: 1,
    }
  )
);