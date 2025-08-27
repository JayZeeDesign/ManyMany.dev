import { Keyboard, X } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsHelp() {
  const { shortcuts, showHelp, setShowHelp } = useKeyboardShortcuts();

  const formatShortcut = (shortcut: any) => {
    const keys = [];
    if (shortcut.metaKey) keys.push('⌘');
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('⌥');
    if (shortcut.shiftKey) keys.push('⇧');
    
    // Format special keys
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

  return (
    <>
      {/* Help trigger button */}
      <button
        onClick={() => setShowHelp(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all"
        style={{ 
          backgroundColor: 'transparent',
          color: 'rgb(var(--color-muted-foreground))',
          border: '1px solid rgb(var(--color-border))'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Keyboard shortcuts (⌘ + /)"
      >
        <Keyboard className="w-4 h-4" />
        <span className="hidden sm:inline">Shortcuts</span>
      </button>

      {/* Modal overlay */}
      {showHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="max-w-md w-full mx-4 rounded-lg shadow-xl"
            style={{ 
              backgroundColor: 'rgb(var(--color-card))',
              border: '1px solid rgb(var(--color-border))'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <h2 
                className="text-lg font-semibold"
                style={{ color: 'rgb(var(--color-foreground))' }}
              >
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'rgb(var(--color-muted-foreground))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                  e.currentTarget.style.color = 'rgb(var(--color-foreground))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgb(var(--color-muted-foreground))';
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-foreground))' }}
                  >
                    {shortcut.description}
                  </span>
                  <kbd 
                    className="px-2 py-1 text-xs font-mono rounded"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-muted))',
                      color: 'rgb(var(--color-muted-foreground))',
                      border: '1px solid rgb(var(--color-border))'
                    }}
                  >
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))}
              
              {/* Additional info */}
              <div 
                className="pt-3 mt-3 border-t text-xs"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-muted-foreground))'
                }}
              >
                <p>Shortcuts work when not typing in input fields.</p>
                <p className="mt-1">Numbers 1-9 switch to worktree by position.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}