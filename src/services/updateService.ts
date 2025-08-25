import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateResult {
  shouldUpdate: boolean;
  manifest: Update | null;
}

export interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  installing: boolean;
  error: string | null;
  progress: number;
  version: string | null;
  body: string | null;
}

export interface UpdateEventCallbacks {
  onStateChange?: (state: UpdateState) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onUpdateFound?: (update: Update) => void;
  onUpdateDownloaded?: () => void;
  onUpdateInstalled?: () => void;
}

class UpdateService {
  private state: UpdateState = {
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    installing: false,
    error: null,
    progress: 0,
    version: null,
    body: null,
  };

  private callbacks: UpdateEventCallbacks = {};
  private currentUpdate: Update | null = null;

  constructor() {
    this.setState = this.setState.bind(this);
  }

  private setState(updates: Partial<UpdateState>) {
    this.state = { ...this.state, ...updates };
    this.callbacks.onStateChange?.(this.state);
  }

  public getState(): UpdateState {
    return { ...this.state };
  }

  public setCallbacks(callbacks: UpdateEventCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async checkForUpdates(silent = false): Promise<UpdateResult | null> {
    if (this.state.checking) {
      console.log('[UpdateService] Already checking for updates, skipping...');
      return null;
    }

    // Allow update checks in development mode for testing
    const isDev = this.isDevelopmentMode();
    console.log('[UpdateService] Starting update check...', { 
      silent, 
      isDev, 
      currentVersion: '0.1.1' // This will be the dev version
    });

    try {
      this.setState({ 
        checking: true, 
        error: null,
        available: false,
        version: null,
        body: null 
      });

      console.log('[UpdateService] Calling Tauri updater check...');
      const update = await check();
      
      console.log('[UpdateService] Update check result:', { 
        hasUpdate: !!update, 
        version: update?.version, 
        body: update?.body 
      });
      
      if (update) {
        this.currentUpdate = update;
        this.setState({
          checking: false,
          available: true,
          version: update.version,
          body: update.body || null,
        });

        console.log('[UpdateService] Update available!', {
          version: update.version,
          silent
        });

        if (!silent) {
          this.callbacks.onUpdateFound?.(update);
        }

        return { shouldUpdate: true, manifest: update };
      } else {
        this.setState({
          checking: false,
          available: false,
        });

        console.log('[UpdateService] No updates available');
        return { shouldUpdate: false, manifest: null };
      }
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error('[UpdateService] Update check failed:', {
        error: errorMessage,
        rawError: error,
        silent
      });
      
      this.setState({
        checking: false,
        error: errorMessage,
      });

      // Always show errors in development mode for debugging
      if (!silent || this.isDevelopmentMode()) {
        this.callbacks.onError?.(errorMessage);
      }

      // Don't throw error for silent checks to prevent disrupting app startup
      if (!silent) {
        throw error;
      }
      
      return null;
    }
  }

  private isDevelopmentMode(): boolean {
    try {
      // Check if running in development mode
      return process.env.NODE_ENV === 'development' || 
             window.location.hostname === 'localhost' ||
             window.location.hostname.startsWith('127.0.0.1') ||
             window.location.protocol === 'tauri:';
    } catch {
      return false;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('could not fetch a valid release json')) {
        return 'No releases found. This is normal during development.';
      }
      
      if (message.includes('network') || message.includes('fetch')) {
        return 'Unable to connect to update server. Please check your internet connection.';
      }
      
      if (message.includes('permission') || message.includes('unauthorized')) {
        return 'Update server access denied. Please contact support.';
      }
      
      return `Update check failed: ${error.message}`;
    }
    
    return 'An unknown error occurred while checking for updates';
  }

  public async downloadAndInstall(): Promise<void> {
    if (!this.currentUpdate) {
      console.error('[UpdateService] No update available to download');
      throw new Error('No update available to download');
    }

    if (this.state.downloading || this.state.installing) {
      console.log('[UpdateService] Download already in progress, skipping...');
      return;
    }

    console.log('[UpdateService] Starting download and install...', {
      version: this.currentUpdate.version,
      currentVersion: this.currentUpdate.currentVersion,
      body: this.currentUpdate.body,
      date: this.currentUpdate.date
    });

    try {
      this.setState({
        downloading: true,
        downloaded: false,
        error: null,
        progress: 0,
      });

      // Download and install with progress tracking
      console.log('[UpdateService] About to call downloadAndInstall...');
      
      await this.currentUpdate.downloadAndInstall((event) => {
        console.log('[UpdateService] Download event received:', {
          event: event.event,
          timestamp: new Date().toISOString()
        });
        
        switch (event.event) {
          case 'Started':
            console.log('[UpdateService] ✅ Download started successfully');
            this.setState({ downloading: true, progress: 0 });
            break;
          case 'Progress':
            console.log('[UpdateService] 📊 Download progress: chunk received');
            // For now, we'll show indeterminate progress since we don't have contentLength
            this.setState({ progress: 50 }); // Show 50% as indeterminate progress
            this.callbacks.onProgress?.(50);
            break;
          case 'Finished':
            console.log('[UpdateService] ✅ Download completed, starting installation...');
            this.setState({
              downloading: false,
              downloaded: true,
              progress: 100,
              installing: true,
            });
            this.callbacks.onUpdateDownloaded?.();
            break;
        }
      });

      console.log('[UpdateService] ✅ Installation completed successfully!', {
        version: this.currentUpdate?.version,
        timestamp: new Date().toISOString(),
        state: this.state
      });
      this.callbacks.onUpdateInstalled?.();

      // Auto-restart after successful installation
      setTimeout(async () => {
        try {
          console.log('[UpdateService] Attempting to restart application...');
          await relaunch();
        } catch (error) {
          console.error('[UpdateService] Failed to relaunch app:', error);
          this.setState({
            installing: false,
            error: 'Update installed but failed to restart. Please restart manually.',
          });
        }
      }, 1000);

    } catch (error) {
      console.error('[UpdateService] ❌ Download/Install failed with detailed error:', {
        error: error,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        updateVersion: this.currentUpdate?.version,
        currentState: this.state
      });

      // Try to identify specific error types
      let userFriendlyMessage = 'Failed to download and install update';
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      
      if (errorMsg.includes('signature') || errorMsg.includes('verify') || errorMsg.includes('invalid')) {
        console.error('[UpdateService] 🔐 Signature verification likely failed - this could be due to fake signatures in latest.json');
        userFriendlyMessage = 'Update signature verification failed';
      } else if (errorMsg.includes('network') || errorMsg.includes('download') || errorMsg.includes('fetch')) {
        console.error('[UpdateService] 🌐 Network/download error');
        userFriendlyMessage = 'Failed to download update files';
      } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
        console.error('[UpdateService] 🔒 Permission error during installation');
        userFriendlyMessage = 'Permission denied during update installation';
      }
      
      this.setState({
        downloading: false,
        downloaded: false,
        installing: false,
        error: userFriendlyMessage,
      });
      
      this.callbacks.onError?.(userFriendlyMessage);
      throw error;
    }
  }

  public async installAndRelaunch(): Promise<void> {
    if (!this.state.downloaded) {
      throw new Error('Update not downloaded yet');
    }

    try {
      this.setState({ installing: true, error: null });
      await relaunch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to restart application';
      this.setState({
        installing: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public resetState() {
    this.setState({
      checking: false,
      available: false,
      downloading: false,
      downloaded: false,
      installing: false,
      error: null,
      progress: 0,
      version: null,
      body: null,
    });
    this.currentUpdate = null;
  }

  public dismissUpdate() {
    this.setState({
      available: false,
      error: null,
    });
    this.currentUpdate = null;
  }
}

// Singleton instance
export const updateService = new UpdateService();