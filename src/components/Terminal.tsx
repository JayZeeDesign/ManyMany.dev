import React, { useEffect, useRef, useState, useImperativeHandle, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import '@xterm/xterm/css/xterm.css';
import { useTerminalStore } from '@/stores/terminalStore';
import { useProjectStore } from '@/stores/projectStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

interface TerminalProps {
  terminalId?: string; // Backend terminal ID
  frontendTerminalId: string; // Frontend terminal ID for focus management
  worktreeId: string;
  workingDirectory: string;
  name: string;
  isRestored?: boolean;
  autoCommand?: string;
}

export const Terminal = React.forwardRef<{ focus: () => void }, TerminalProps>(({
  terminalId: providedTerminalId,
  frontendTerminalId,
  workingDirectory,
  name,
  isRestored,
  autoCommand
}, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(providedTerminalId || null);
  
  // Get store methods for focus and navigation
  const { registerTerminalRef, focusActiveTerminal } = useTerminalStore();
  const { 
    projects, 
    selectedProjectId, 
    selectedWorktreeId,
    selectProject, 
    selectWorktree, 
    getSelectedProject 
  } = useProjectStore();
  const { settings } = useAppSettingsStore();
  
  // Event listener cleanup functions
  const unlistenOutputRef = useRef<UnlistenFn | null>(null);
  const unlistenClosedRef = useRef<UnlistenFn | null>(null);
  
  // Store current terminal ID in ref for input handlers
  const currentTerminalIdRef = useRef<string | null>(terminalId);

  // Enhanced focus function with better reliability
  const focusTerminal = useCallback(() => {
    try {
      if (xtermRef.current) {
        xtermRef.current.focus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to focus terminal:', error);
      return false;
    }
  }, []);

  // Expose focus function to parent component
  useImperativeHandle(ref, () => ({
    focus: focusTerminal
  }));

  // Register this terminal's focus method with the store using frontend ID
  useEffect(() => {
    const terminalHandle = { focus: focusTerminal };
    registerTerminalRef(frontendTerminalId, terminalHandle);
    
    console.log(`[Terminal] Registered focus handler for frontend ID: ${frontendTerminalId}`);
    
    // Cleanup on unmount
    return () => {
      registerTerminalRef(frontendTerminalId, null);
      console.log(`[Terminal] Unregistered focus handler for frontend ID: ${frontendTerminalId}`);
    };
  }, [frontendTerminalId, focusTerminal, registerTerminalRef]);

  // Navigation functions for terminal shortcuts
  const navigateToNextWorktree = useCallback(async () => {
    try {
      const project = getSelectedProject();
      if (!project?.worktrees) return;
      
      const worktrees = project.worktrees;
      const currentIndex = selectedWorktreeId ? worktrees.findIndex(w => w.id === selectedWorktreeId) : -1;
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % worktrees.length;
      
      if (worktrees[nextIndex]) {
        console.log(`[Terminal] Navigating to next worktree: ${worktrees[nextIndex].id}`);
        selectProject(project.id);
        selectWorktree(worktrees[nextIndex].id);
        
        // Auto-focus after navigation
        if (settings.autoFocusTerminalOnNavigation) {
          setTimeout(async () => {
            await focusActiveTerminal(worktrees[nextIndex].id);
          }, 200);
        }
      }
    } catch (error) {
      console.error('Terminal navigation error:', error);
    }
  }, [getSelectedProject, selectedWorktreeId, selectProject, selectWorktree, settings.autoFocusTerminalOnNavigation, focusActiveTerminal]);

  const navigateToPreviousWorktree = useCallback(async () => {
    try {
      const project = getSelectedProject();
      if (!project?.worktrees) return;
      
      const worktrees = project.worktrees;
      const currentIndex = selectedWorktreeId ? worktrees.findIndex(w => w.id === selectedWorktreeId) : -1;
      const prevIndex = currentIndex === -1 ? worktrees.length - 1 : (currentIndex - 1 + worktrees.length) % worktrees.length;
      
      if (worktrees[prevIndex]) {
        console.log(`[Terminal] Navigating to previous worktree: ${worktrees[prevIndex].id}`);
        selectProject(project.id);
        selectWorktree(worktrees[prevIndex].id);
        
        // Auto-focus after navigation
        if (settings.autoFocusTerminalOnNavigation) {
          setTimeout(async () => {
            await focusActiveTerminal(worktrees[prevIndex].id);
          }, 200);
        }
      }
    } catch (error) {
      console.error('Terminal navigation error:', error);
    }
  }, [getSelectedProject, selectedWorktreeId, selectProject, selectWorktree, settings.autoFocusTerminalOnNavigation, focusActiveTerminal]);

  // Project navigation functions
  const navigateToNextProject = useCallback(async () => {
    try {
      if (projects.length === 0) return;

      const currentIndex = selectedProjectId ? projects.findIndex(p => p.id === selectedProjectId) : -1;
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projects.length;
      
      const nextProject = projects[nextIndex];
      if (!nextProject) return;
      
      console.log(`[Terminal] Navigating to next project: ${nextProject.id}`);
      selectProject(nextProject.id);
      
      // Select the first worktree if available
      if (nextProject.worktrees && nextProject.worktrees.length > 0) {
        selectWorktree(nextProject.worktrees[0].id);
        
        // Auto-focus after navigation
        if (settings.autoFocusTerminalOnNavigation) {
          setTimeout(async () => {
            await focusActiveTerminal(nextProject.worktrees[0].id);
          }, 200);
        }
      } else {
        selectWorktree(null);
      }
    } catch (error) {
      console.error('Terminal project navigation error:', error);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree, settings.autoFocusTerminalOnNavigation, focusActiveTerminal]);

  const navigateToPreviousProject = useCallback(async () => {
    try {
      if (projects.length === 0) return;

      const currentIndex = selectedProjectId ? projects.findIndex(p => p.id === selectedProjectId) : -1;
      const prevIndex = currentIndex === -1 ? projects.length - 1 : (currentIndex - 1 + projects.length) % projects.length;
      
      const prevProject = projects[prevIndex];
      if (!prevProject) return;
      
      console.log(`[Terminal] Navigating to previous project: ${prevProject.id}`);
      selectProject(prevProject.id);
      
      // Select the first worktree if available
      if (prevProject.worktrees && prevProject.worktrees.length > 0) {
        selectWorktree(prevProject.worktrees[0].id);
        
        // Auto-focus after navigation
        if (settings.autoFocusTerminalOnNavigation) {
          setTimeout(async () => {
            await focusActiveTerminal(prevProject.worktrees[0].id);
          }, 200);
        }
      } else {
        selectWorktree(null);
      }
    } catch (error) {
      console.error('Terminal project navigation error:', error);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree, settings.autoFocusTerminalOnNavigation, focusActiveTerminal]);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) {
      // Don't create if XTerm instance already exists (prevents re-creation on re-renders)
      return;
    }
    // Create XTerm instance
    const xterm = new XTerm({
      theme: {
        background: '#000000',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      convertEol: true,
      disableStdin: false,
      allowTransparency: true,
      // Enable proper terminal key handling
      macOptionIsMeta: true,
      macOptionClickForcesSelection: false,
      rightClickSelectsWord: false,
      // Enable scrollback for terminal history
      scrollback: 1000,
    });

    // Add addons
    const fitAddon = new FitAddon();
    
    // Custom link handler for Tauri desktop app
    const handleLinkClick = async (_event: MouseEvent, uri: string) => {
      try {
        await openUrl(uri);
      } catch (error) {
        console.error('Failed to open link:', uri, error);
      }
    };
    
    const webLinksAddon = new WebLinksAddon(handleLinkClick);
    
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    
    // Open terminal in DOM
    xterm.open(terminalRef.current);
    
    // Store references
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Fit terminal to container after a short delay with validation
    const initialFit = () => {
      if (terminalRef.current && fitAddon) {
        const rect = terminalRef.current.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
          try {
            fitAddon.fit();
          } catch (error) {
            console.warn('Failed to fit terminal on initial load:', error);
          }
        } else {
          // Retry with longer delay if container isn't ready
          setTimeout(initialFit, 200);
        }
      }
    };
    
    setTimeout(initialFit, 100);

    // Input handlers will be set up in setupEventListeners when we have a terminal ID

    // Don't create backend terminal here - WorktreeView handles that
    // Just wait for the terminal ID to be provided via props

    // Handle window resize with dimension validation and retry
    const handleResize = () => {
      if (fitAddon && terminalId && terminalRef.current) {
        try {
          // Validate container has valid dimensions before fitting
          const container = terminalRef.current;
          const rect = container.getBoundingClientRect();
          
          if (rect.width > 0 && rect.height > 0) {
            fitAddon.fit();
            const { cols, rows } = xterm;
            console.log(`[Terminal] Resized terminal ${name}: ${cols}x${rows} (container: ${rect.width}x${rect.height})`);
            invoke('resize_terminal', { terminalId, cols, rows }).catch(console.error);
          } else {
            console.warn(`[Terminal] Skipping fit - invalid container dimensions: ${rect.width}x${rect.height}`);
            // Retry after a short delay if dimensions are invalid
            setTimeout(() => {
              if (fitAddon && terminalRef.current) {
                const retryRect = terminalRef.current.getBoundingClientRect();
                if (retryRect.width > 0 && retryRect.height > 0) {
                  console.log(`[Terminal] Retry fit successful for ${name}`);
                  fitAddon.fit();
                  const { cols, rows } = xterm;
                  invoke('resize_terminal', { terminalId, cols, rows }).catch(console.error);
                }
              }
            }, 100);
          }
        } catch (error) {
          console.warn('Failed to resize terminal:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      // Clean up event listeners
      if (unlistenOutputRef.current) {
        unlistenOutputRef.current();
        unlistenOutputRef.current = null;
      }
      if (unlistenClosedRef.current) {
        unlistenClosedRef.current();
        unlistenClosedRef.current = null;
      }
      
      window.removeEventListener('resize', handleResize);
      
      // Only cleanup XTerm if component is actually unmounting
      // (not just hidden via display:none)
      if (xterm) {
        xterm.dispose();
        xtermRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle terminal ID changes for restored terminals
  useEffect(() => {
    if (providedTerminalId && providedTerminalId !== terminalId && xtermRef.current) {
      setTerminalId(providedTerminalId);
      currentTerminalIdRef.current = providedTerminalId; // Update ref for input handlers
      
      // Only setup listeners if we don't already have them
      const hasListeners = unlistenOutputRef.current && unlistenClosedRef.current;
      
      if (!hasListeners) {
        setupEventListeners(providedTerminalId);
      }
    }
  }, [providedTerminalId, terminalId, name]);


  const setupEventListeners = async (id: string) => {
    try {
      // Clean up existing listeners first
      if (unlistenOutputRef.current) {
        unlistenOutputRef.current();
        unlistenOutputRef.current = null;
      }
      if (unlistenClosedRef.current) {
        unlistenClosedRef.current();
        unlistenClosedRef.current = null;
      }

      // Listen for terminal output - REAL-TIME STREAMING!
      unlistenOutputRef.current = await listen(`terminal-output-${id}`, (event) => {
        const output = event.payload as string;
        if (xtermRef.current) {
          xtermRef.current.write(output);
        }
      });

      // Listen for terminal closure
      unlistenClosedRef.current = await listen(`terminal-closed-${id}`, () => {
        if (xtermRef.current) {
          xtermRef.current.write('\r\n\x1b[33mTerminal session ended\x1b[0m\r\n');
        }
      });
      
      // Set up input handlers now that we have a terminal ID
      if (xtermRef.current) {
        // Update terminal ID ref for input handlers
        currentTerminalIdRef.current = id;
        
        // Handle user input - send via terminal_input command  
        xtermRef.current.onData(async (data) => {
          const currentId = currentTerminalIdRef.current;
          if (currentId) {
            try {
              await invoke('terminal_input', { terminalId: currentId, data });
            } catch (error) {
              console.error(`Terminal ${name}: Failed to send input to backend terminal ${currentId}:`, error);
            }
          }
        });

        // Intercept navigation shortcuts BEFORE xterm processes them
        xtermRef.current.attachCustomKeyEventHandler((event) => {
          // Only handle keydown events
          if (event.type !== 'keydown') return true;
          
          const hasModifier = event.metaKey || event.ctrlKey;
          
          if (hasModifier) {
            switch (event.key) {
              case 'ArrowRight':
                console.log(`[Terminal] Executing next worktree navigation`);
                event.preventDefault();
                navigateToNextWorktree();
                return false; // Prevent xterm.js from processing
                
              case 'ArrowLeft':
                console.log(`[Terminal] Executing previous worktree navigation`);
                event.preventDefault();
                navigateToPreviousWorktree();
                return false; // Prevent xterm.js from processing
                
              case 'ArrowDown':
                console.log(`[Terminal] Executing next project navigation`);
                event.preventDefault();
                navigateToNextProject();
                return false; // Prevent xterm.js from processing
                
              case 'ArrowUp':
                console.log(`[Terminal] Executing previous project navigation`);
                event.preventDefault();
                navigateToPreviousProject();
                return false; // Prevent xterm.js from processing
                
              case '/':
                // Let help shortcut bubble up to global handler by not preventing default
                console.log(`[Terminal] Allowing help shortcut to bubble up`);
                return false; // Prevent xterm.js from processing, let it bubble to document
                
              default:
                // Allow other Cmd/Ctrl combinations to be processed normally
                return true;
            }
          }
          
          // Allow all other keys to be processed normally by xterm.js
          return true;
        });

        // Handle special key combinations that XTerm doesn't handle by default
        xtermRef.current.onKey(({ domEvent }) => {
          const currentId = currentTerminalIdRef.current;
          if (currentId && domEvent.metaKey) { // Cmd key on Mac
            let specialKey = '';
            
            switch (domEvent.key) {
              case 'Backspace': // Cmd+Delete -> Clear line (Ctrl+U)
                specialKey = '\x15'; // Ctrl+U
                break;
              // Remove ArrowLeft/Right from here since they're now handled by global navigation
              case 'a': // Cmd+A -> Select all (Ctrl+A)
                if (domEvent.shiftKey) return; // Let browser handle Cmd+Shift+A
                specialKey = '\x01'; // Ctrl+A
                break;
            }
            
            if (specialKey) {
              domEvent.preventDefault();
              invoke('terminal_input', { terminalId: currentId, data: specialKey }).catch(console.error);
            }
          }
        });
      }
      
      // Add welcome message when connecting to terminal
      if (xtermRef.current) {
        setTimeout(() => {
          if (xtermRef.current) {
            if (isRestored) {
              xtermRef.current.write(`\r\n\x1b[33mTerminal restored in ${workingDirectory}\x1b[0m\r\n`);
            } else {
              xtermRef.current.write('\r\n\x1b[36mTerminal session created\x1b[0m\r\n');
            }
          }
        }, 200);
        
        // Execute auto command if provided
        if (autoCommand && autoCommand.trim() && !isRestored) {
          setTimeout(async () => {
            try {
              await invoke('terminal_input', { 
                terminalId: id, 
                data: autoCommand.trim() + '\n' 
              });
            } catch (error) {
              console.error(`Failed to execute auto command "${autoCommand}":`, error);
            }
          }, 800); // Wait a bit longer for terminal to be fully ready
        }
      }
    } catch (error) {
      console.error(`Failed to setup event listeners:`, error);
    }
  };

  const handleFit = () => {
    if (fitAddonRef.current && terminalRef.current) {
      try {
        const rect = terminalRef.current.getBoundingClientRect();
        console.log(`[Terminal] Manual fit for ${name}: container ${rect.width}x${rect.height}`);
        
        if (rect.width > 0 && rect.height > 0) {
          fitAddonRef.current.fit();
          const { cols, rows } = xtermRef.current!;
          console.log(`[Terminal] Manual fit successful for ${name}: ${cols}x${rows}`);
        } else {
          console.warn(`[Terminal] Skipping manual fit - invalid dimensions: ${rect.width}x${rect.height}`);
        }
      } catch (error) {
        console.warn('Failed to fit terminal manually:', error);
      }
    }
  };

  return (
    <div className="w-full h-full" style={{ minHeight: '200px' }}>
      <div
        ref={terminalRef}
        className="w-full h-full"
        style={{ minHeight: '200px' }}
        onClick={handleFit}
      />
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;