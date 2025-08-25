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
      return null;
    }

    // Skip update checks in development mode
    if (this.isDevelopmentMode()) {
      if (!silent) {
        console.log('[UpdateService] Skipping update check in development mode');
      }
      return null;
    }

    try {
      this.setState({ 
        checking: true, 
        error: null,
        available: false,
        version: null,
        body: null 
      });

      const update = await check();
      
      if (update) {
        this.currentUpdate = update;
        this.setState({
          checking: false,
          available: true,
          version: update.version,
          body: update.body || null,
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

        return { shouldUpdate: false, manifest: null };
      }
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.setState({
        checking: false,
        error: errorMessage,
      });

      // Only show errors for manual checks, suppress for automatic checks
      if (!silent) {
        this.callbacks.onError?.(errorMessage);
        console.error('[UpdateService] Update check failed:', error);
      } else {
        console.warn('[UpdateService] Silent update check failed:', errorMessage);
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
      throw new Error('No update available to download');
    }

    if (this.state.downloading || this.state.installing) {
      return;
    }

    try {
      this.setState({
        downloading: true,
        downloaded: false,
        error: null,
        progress: 0,
      });

      // Download and install with progress tracking
      await this.currentUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            this.setState({ downloading: true, progress: 0 });
            break;
          case 'Progress':
            // For now, we'll show indeterminate progress since we don't have contentLength
            this.setState({ progress: 50 }); // Show 50% as indeterminate progress
            this.callbacks.onProgress?.(50);
            break;
          case 'Finished':
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

      this.callbacks.onUpdateInstalled?.();

      // Auto-restart after successful installation
      setTimeout(async () => {
        try {
          await relaunch();
        } catch (error) {
          console.error('Failed to relaunch app:', error);
          this.setState({
            installing: false,
            error: 'Update installed but failed to restart. Please restart manually.',
          });
        }
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download and install update';
      this.setState({
        downloading: false,
        downloaded: false,
        installing: false,
        error: errorMessage,
      });
      
      this.callbacks.onError?.(errorMessage);
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