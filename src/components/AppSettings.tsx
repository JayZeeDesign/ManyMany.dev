import { useState } from 'react';
import { Settings, Keyboard, Monitor, Terminal, Download, Upload, RotateCcw, X, Check } from 'lucide-react';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { ShortcutsSettings } from './ShortcutsSettings';

interface AppSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSettings({ isOpen, onClose }: AppSettingsProps) {
  const { settings, updateSetting, resetToDefaults, exportSettings, importSettings } = useAppSettingsStore();
  const [activeTab, setActiveTab] = useState<'general' | 'shortcuts' | 'terminal'>('general');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = () => {
    const settingsJson = exportSettings();
    navigator.clipboard.writeText(settingsJson).then(() => {
      // Could show a toast notification here
      console.log('Settings exported to clipboard');
    });
  };

  const handleImport = () => {
    const success = importSettings(importText);
    setImportStatus(success ? 'success' : 'error');
    
    setTimeout(() => {
      setImportStatus('idle');
      if (success) {
        setShowImport(false);
        setImportText('');
      }
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-200"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div 
        className="max-w-4xl w-full mx-4 rounded-lg shadow-xl transition-all duration-200 max-h-[90vh] overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-card))',
          border: '1px solid rgb(var(--color-border))',
          animation: 'slideIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" style={{ color: 'rgb(var(--color-primary))' }} />
            <h2 
              id="settings-title"
              className="text-xl font-semibold"
              style={{ color: 'rgb(var(--color-foreground))' }}
            >
              App Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md transition-colors"
            style={{ color: 'rgb(var(--color-muted-foreground))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
              e.currentTarget.style.color = 'rgb(var(--color-foreground))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
            }}
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div 
            className="w-64 border-r"
            style={{ 
              backgroundColor: 'rgb(var(--color-muted) / 0.5)',
              borderColor: 'rgb(var(--color-border))'
            }}
          >
            <div className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === 'general' ? 'font-medium' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'general' ? 'rgb(var(--color-primary) / 0.1)' : 'transparent',
                  color: activeTab === 'general' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-foreground))',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'general') {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'general') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Monitor className="w-4 h-4" />
                General
              </button>

              <button
                onClick={() => setActiveTab('shortcuts')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === 'shortcuts' ? 'font-medium' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'shortcuts' ? 'rgb(var(--color-primary) / 0.1)' : 'transparent',
                  color: activeTab === 'shortcuts' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-foreground))',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'shortcuts') {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'shortcuts') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Keyboard className="w-4 h-4" />
                Keyboard Shortcuts
              </button>

              <button
                onClick={() => setActiveTab('terminal')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === 'terminal' ? 'font-medium' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'terminal' ? 'rgb(var(--color-primary) / 0.1)' : 'transparent',
                  color: activeTab === 'terminal' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-foreground))',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'terminal') {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'terminal') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Terminal className="w-4 h-4" />
                Terminal
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-foreground))' }}>
                      General Preferences
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Theme Setting */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-foreground))' }}>
                          Theme
                        </label>
                        <select
                          value={settings.theme}
                          onChange={(e) => updateSetting('theme', e.target.value as any)}
                          className="px-3 py-2 rounded-md border bg-transparent"
                          style={{ 
                            borderColor: 'rgb(var(--color-border))',
                            color: 'rgb(var(--color-foreground))'
                          }}
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="system">System</option>
                        </select>
                      </div>

                      {/* Update Settings */}
                      <div>
                        <h4 className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-foreground))' }}>
                          Updates
                        </h4>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.showUpdateNotifications}
                              onChange={(e) => updateSetting('showUpdateNotifications', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm" style={{ color: 'rgb(var(--color-foreground))' }}>
                              Show update notifications
                            </span>
                          </label>
                          
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.autoCheckForUpdates}
                              onChange={(e) => updateSetting('autoCheckForUpdates', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm" style={{ color: 'rgb(var(--color-foreground))' }}>
                              Automatically check for updates
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Navigation Settings */}
                      <div>
                        <h4 className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-foreground))' }}>
                          Navigation
                        </h4>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.autoFocusTerminalOnNavigation}
                              onChange={(e) => updateSetting('autoFocusTerminalOnNavigation', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm" style={{ color: 'rgb(var(--color-foreground))' }}>
                              Auto-focus terminal when switching worktrees
                            </span>
                          </label>
                          <p className="text-xs ml-5" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                            Automatically focuses the terminal so you can start typing immediately after using keyboard shortcuts
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings Import/Export */}
                  <div className="pt-6 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <h4 className="text-sm font-medium mb-3" style={{ color: 'rgb(var(--color-foreground))' }}>
                      Settings Management
                    </h4>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-muted))',
                          color: 'rgb(var(--color-muted-foreground))'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                          e.currentTarget.style.color = 'rgb(var(--color-accent-foreground))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                          e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Export Settings
                      </button>
                      
                      <button
                        onClick={() => setShowImport(!showImport)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-muted))',
                          color: 'rgb(var(--color-muted-foreground))'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                          e.currentTarget.style.color = 'rgb(var(--color-accent-foreground))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                          e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        Import Settings
                      </button>
                      
                      <button
                        onClick={resetToDefaults}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-destructive) / 0.1)',
                          color: 'rgb(var(--color-destructive))'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-destructive))';
                          e.currentTarget.style.color = 'rgb(var(--color-destructive-foreground))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-destructive) / 0.1)';
                          e.currentTarget.style.color = 'rgb(var(--color-destructive))';
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Defaults
                      </button>
                    </div>
                    
                    {showImport && (
                      <div className="mt-4 space-y-2">
                        <textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder="Paste exported settings JSON here..."
                          className="w-full h-32 px-3 py-2 text-sm rounded-md border bg-transparent font-mono"
                          style={{ 
                            borderColor: 'rgb(var(--color-border))',
                            color: 'rgb(var(--color-foreground))'
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleImport}
                            disabled={!importText.trim() || importStatus === 'success'}
                            className="flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50"
                            style={{ 
                              backgroundColor: importStatus === 'success' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-muted))',
                              color: importStatus === 'success' ? 'rgb(var(--color-primary-foreground))' : 'rgb(var(--color-muted-foreground))'
                            }}
                          >
                            {importStatus === 'success' && <Check className="w-4 h-4" />}
                            {importStatus === 'success' ? 'Imported!' : 'Import'}
                          </button>
                          
                          {importStatus === 'error' && (
                            <span className="text-sm py-1" style={{ color: 'rgb(var(--color-destructive))' }}>
                              Invalid settings format
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Keyboard Shortcuts */}
              {activeTab === 'shortcuts' && <ShortcutsSettings />}

              {/* Terminal Settings */}
              {activeTab === 'terminal' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-foreground))' }}>
                      Terminal Preferences
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Default Shell */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-foreground))' }}>
                          Default Shell
                        </label>
                        <input
                          type="text"
                          value={settings.defaultShell}
                          onChange={(e) => updateSetting('defaultShell', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border bg-transparent"
                          style={{ 
                            borderColor: 'rgb(var(--color-border))',
                            color: 'rgb(var(--color-foreground))'
                          }}
                          placeholder="/bin/zsh"
                        />
                      </div>

                      {/* Font Size */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-foreground))' }}>
                          Font Size: {settings.terminalFontSize}px
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="24"
                          value={settings.terminalFontSize}
                          onChange={(e) => updateSetting('terminalFontSize', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      {/* Font Family */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-foreground))' }}>
                          Font Family
                        </label>
                        <select
                          value={settings.terminalFontFamily}
                          onChange={(e) => updateSetting('terminalFontFamily', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border bg-transparent"
                          style={{ 
                            borderColor: 'rgb(var(--color-border))',
                            color: 'rgb(var(--color-foreground))'
                          }}
                        >
                          <option value="Monaco, Menlo, 'Ubuntu Mono', monospace">Monaco / Menlo</option>
                          <option value="'Fira Code', 'Cascadia Code', monospace">Fira Code / Cascadia Code</option>
                          <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                          <option value="'Source Code Pro', monospace">Source Code Pro</option>
                          <option value="'Consolas', monospace">Consolas</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}