import { Keyboard, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsHelp() {
  const { shortcuts, showHelp, setShowHelp } = useKeyboardShortcuts();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (showHelp) {
      // Focus the close button when modal opens
      setTimeout(() => {
        lastFocusableRef.current?.focus();
      }, 100);
    }
  }, [showHelp]);

  // Trap focus within modal
  useEffect(() => {
    if (!showHelp) return;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
          
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [showHelp]);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys: string[] = [];
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

  const handleCloseModal = () => {
    setShowHelp(false);
  };

  return (
    <>
      {/* Help trigger button */}
      <button
        ref={firstFocusableRef}
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
        aria-label="Show keyboard shortcuts help"
        aria-haspopup="dialog"
        title="Keyboard shortcuts (⌘ + /)"
      >
        <Keyboard className="w-4 h-4" />
        <span className="hidden sm:inline">Shortcuts</span>
      </button>

      {/* Modal overlay */}
      {showHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-200"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
        >
          <div 
            ref={modalRef}
            className="max-w-md w-full mx-4 rounded-lg shadow-xl transition-all duration-200"
            style={{ 
              backgroundColor: 'rgb(var(--color-card))',
              border: '1px solid rgb(var(--color-border))',
              animation: 'slideIn 0.2s ease-out',
              transform: 'scale(1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <h2 
                id="shortcuts-title"
                className="text-lg font-semibold"
                style={{ color: 'rgb(var(--color-foreground))' }}
              >
                Keyboard Shortcuts
              </h2>
              <button
                ref={lastFocusableRef}
                onClick={handleCloseModal}
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
                aria-label="Close keyboard shortcuts help"
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