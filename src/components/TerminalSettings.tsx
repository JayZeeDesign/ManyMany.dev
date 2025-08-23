import { useState } from 'react';
import { Plus, X, RotateCcw } from 'lucide-react';
import { useSettingsStore, DefaultTerminalConfig } from '@/stores/settingsStore';

export function TerminalSettings() {
  const {
    defaultTerminals,
    addDefaultTerminal,
    removeDefaultTerminal,
    updateDefaultTerminal,
    resetToDefaults,
  } = useSettingsStore();

  const [editingTerminal, setEditingTerminal] = useState<string | null>(null);

  const handleUpdateTerminal = (id: string, field: keyof DefaultTerminalConfig, value: string | boolean) => {
    updateDefaultTerminal(id, { [field]: value });
  };

  const handleNameEdit = (terminal: DefaultTerminalConfig, newName: string) => {
    if (newName.trim()) {
      updateDefaultTerminal(terminal.id, { name: newName.trim() });
    }
    setEditingTerminal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-foreground))' }}>
            Default Terminal Sessions
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
            Configure terminals that will be automatically created when you create a new worktree
          </p>
        </div>
        
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

      <div className="space-y-3">
        {defaultTerminals.map((terminal, index) => (
          <div
            key={terminal.id}
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: 'rgb(var(--color-card))',
              borderColor: 'rgb(var(--color-border))'
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                {editingTerminal === terminal.id ? (
                  <input
                    type="text"
                    defaultValue={terminal.name}
                    autoFocus
                    className="px-2 py-1 text-sm rounded border bg-transparent"
                    style={{ 
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-foreground))'
                    }}
                    onBlur={(e) => handleNameEdit(terminal, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNameEdit(terminal, e.currentTarget.value);
                      }
                      if (e.key === 'Escape') {
                        setEditingTerminal(null);
                      }
                    }}
                  />
                ) : (
                  <span
                    className="text-sm font-medium cursor-pointer hover:underline"
                    style={{ 
                      color: 'rgb(var(--color-foreground))'
                    }}
                    onClick={() => setEditingTerminal(terminal.id)}
                  >
                    {terminal.name}
                  </span>
                )}
              </div>
              
              <button
                onClick={() => removeDefaultTerminal(terminal.id)}
                className="p-1 rounded transition-colors opacity-60 hover:opacity-100"
                style={{ 
                  color: 'rgb(var(--color-destructive))'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-destructive) / 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                Auto-run Command
              </label>
              <input
                type="text"
                value={terminal.command}
                onChange={(e) => handleUpdateTerminal(terminal.id, 'command', e.target.value)}
                placeholder="Enter command to run automatically (e.g., npm run dev)"
                className="w-full px-3 py-2 text-sm rounded border bg-transparent"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-foreground))'
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                Use && to chain multiple commands (e.g., "pnpm install && pnpm dev")
              </p>
            </div>
          </div>
        ))}
        
        {defaultTerminals.length === 0 && (
          <div className="text-center py-8" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
            <p>No default terminals configured.</p>
            <p className="text-sm mt-1">Click "Add Terminal" below to create your first default terminal.</p>
          </div>
        )}
      </div>
      
      {/* Add Terminal Button */}
      <div className="pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <button
          onClick={addDefaultTerminal}
          className="w-full px-4 py-3 text-sm rounded-md transition-colors flex items-center justify-center gap-2"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary))',
            color: 'rgb(var(--color-primary-foreground))'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus className="w-4 h-4" />
          Add Terminal
        </button>
      </div>
    </div>
  );
}