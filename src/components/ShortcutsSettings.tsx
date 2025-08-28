import { useState } from 'react';
import { Keyboard, RotateCcw, Save, X } from 'lucide-react';
import { useShortcutsStore, ShortcutConfig } from '@/stores/shortcutsStore';

export function ShortcutsSettings() {
  const { 
    shortcuts, 
    enabled, 
    updateShortcut, 
    resetToDefaults, 
    toggleEnabled 
  } = useShortcutsStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempConfig, setTempConfig] = useState<Partial<ShortcutConfig>>({});

  const formatShortcut = (shortcut: ShortcutConfig) => {
    const keys: string[] = [];
    if (shortcut.metaKey) keys.push('⌘');
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('⌥');
    if (shortcut.shiftKey) keys.push('⇧');
    
    let key = shortcut.key;
    switch (key) {
      case 'ArrowLeft': key = '←'; break;
      case 'ArrowRight': key = '→'; break;
      case 'ArrowUp': key = '↑'; break;
      case 'ArrowDown': key = '↓'; break;
    }
    
    keys.push(key);
    return keys.join(' + ');
  };

  const handleEdit = (shortcut: ShortcutConfig) => {
    setEditingId(shortcut.id);
    setTempConfig({ ...shortcut });
  };

  const handleSave = () => {
    if (editingId && tempConfig) {
      updateShortcut(editingId, tempConfig);
      setEditingId(null);
      setTempConfig({});
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempConfig({});
  };

  const handleKeyCapture = (event: React.KeyboardEvent) => {
    event.preventDefault();
    
    // Don't capture just modifier keys
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) return;
    
    setTempConfig(prev => ({
      ...prev,
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2" 
              style={{ color: 'rgb(var(--color-foreground))' }}>
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
            Customize keyboard shortcuts for navigation
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={toggleEnabled}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'rgb(var(--color-foreground))' }}>
              Enable shortcuts
            </span>
          </label>
          
          <button
            onClick={resetToDefaults}
            className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-muted))',
              color: 'rgb(var(--color-muted-foreground))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted) / 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: 'rgb(var(--color-card))',
              borderColor: 'rgb(var(--color-border))',
              opacity: enabled ? 1 : 0.6
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm font-medium" 
                      style={{ color: 'rgb(var(--color-foreground))' }}>
                  {shortcut.description}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {editingId === shortcut.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempConfig.key ? formatShortcut(tempConfig as ShortcutConfig) : 'Press keys...'}
                      onKeyDown={handleKeyCapture}
                      placeholder="Press keys..."
                      className="px-2 py-1 text-xs font-mono rounded border bg-transparent min-w-[100px] text-center"
                      style={{ 
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-foreground))',
                        backgroundColor: 'rgb(var(--color-muted))'
                      }}
                      readOnly
                    />
                    <button
                      onClick={handleSave}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'rgb(var(--color-primary))' }}
                      disabled={!tempConfig.key}
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'rgb(var(--color-destructive))' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(shortcut)}
                    className="px-2 py-1 text-xs font-mono rounded border transition-colors"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-muted))',
                      color: 'rgb(var(--color-muted-foreground))',
                      borderColor: 'rgb(var(--color-border))'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                      e.currentTarget.style.color = 'rgb(var(--color-accent-foreground))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                      e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
                    }}
                    disabled={!enabled}
                  >
                    {formatShortcut(shortcut)}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div 
        className="p-3 rounded-lg text-xs"
        style={{ 
          backgroundColor: 'rgb(var(--color-muted))',
          color: 'rgb(var(--color-muted-foreground))'
        }}
      >
        <p><strong>Tip:</strong> Click on any shortcut to customize it. The shortcuts automatically adapt to your platform (⌘ on Mac, Ctrl on Windows/Linux).</p>
      </div>
    </div>
  );
}