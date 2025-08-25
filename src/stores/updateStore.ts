import { create } from 'zustand';
import { updateService, UpdateState } from '../services/updateService';

interface UpdateStoreState extends UpdateState {
  showUpdateBanner: boolean;
  showUpdateDialog: boolean;
  autoCheckEnabled: boolean;
  lastChecked: Date | null;
}

interface UpdateStoreActions {
  setShowUpdateBanner: (show: boolean) => void;
  setShowUpdateDialog: (show: boolean) => void;
  setAutoCheckEnabled: (enabled: boolean) => void;
  checkForUpdates: (silent?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissUpdate: () => void;
  resetState: () => void;
  updateState: (state: UpdateState) => void;
}

type UpdateStore = UpdateStoreState & UpdateStoreActions;

export const useUpdateStore = create<UpdateStore>((set, get) => {
  // Initialize callbacks for the update service
  updateService.setCallbacks({
    onStateChange: (state: UpdateState) => {
      get().updateState(state);
    },
    onUpdateFound: () => {
      console.log('[UpdateStore] Update found! Showing banner...');
      set({ showUpdateBanner: true });
    },
    onError: (error: string) => {
      console.warn('[UpdateStore] Update error:', error);
      // Only show error notifications for manual checks, not automatic ones
      // The updateService now handles error suppression for silent checks
    },
  });

  return {
    // State from UpdateState
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    installing: false,
    error: null,
    progress: 0,
    version: null,
    body: null,

    // Additional UI state
    showUpdateBanner: false,
    showUpdateDialog: false,
    autoCheckEnabled: true,
    lastChecked: null,

    // Actions
    setShowUpdateBanner: (show: boolean) => {
      set({ showUpdateBanner: show });
    },

    setShowUpdateDialog: (show: boolean) => {
      set({ showUpdateDialog: show });
    },

    setAutoCheckEnabled: (enabled: boolean) => {
      set({ autoCheckEnabled: enabled });
      // Save to localStorage
      localStorage.setItem('update_auto_check', enabled.toString());
    },

    checkForUpdates: async (silent = false) => {
      console.log('[UpdateStore] Initiating update check...', { silent });
      try {
        const result = await updateService.checkForUpdates(silent);
        console.log('[UpdateStore] Update check completed:', result);
        if (result !== null) {
          set({ lastChecked: new Date() });
        }
      } catch (error) {
        console.error('[UpdateStore] Update check failed:', error);
        // Error handling is now done in updateService
        // Only log for debugging purposes
        if (!silent) {
          console.debug('[UpdateStore] Manual update check failed:', error);
        }
      }
    },

    downloadAndInstall: async () => {
      console.log('[UpdateStore] Starting download and install...');
      try {
        set({ showUpdateDialog: true, showUpdateBanner: false });
        await updateService.downloadAndInstall();
        console.log('[UpdateStore] Download and install completed successfully');
      } catch (error) {
        console.error('[UpdateStore] Failed to download and install update:', error);
      }
    },

    dismissUpdate: () => {
      updateService.dismissUpdate();
      set({ 
        showUpdateBanner: false,
        showUpdateDialog: false,
        available: false,
      });
    },

    resetState: () => {
      updateService.resetState();
      set({
        checking: false,
        available: false,
        downloading: false,
        downloaded: false,
        installing: false,
        error: null,
        progress: 0,
        version: null,
        body: null,
        showUpdateBanner: false,
        showUpdateDialog: false,
      });
    },

    updateState: (state: UpdateState) => {
      set({
        checking: state.checking,
        available: state.available,
        downloading: state.downloading,
        downloaded: state.downloaded,
        installing: state.installing,
        error: state.error,
        progress: state.progress,
        version: state.version,
        body: state.body,
      });
    },
  };
});

// Initialize auto-check setting from localStorage
const savedAutoCheck = localStorage.getItem('update_auto_check');
if (savedAutoCheck !== null) {
  useUpdateStore.getState().setAutoCheckEnabled(savedAutoCheck === 'true');
}