import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  terminalId?: string;
  worktreeId: string;
  workingDirectory: string;
  name: string;
  isRestored?: boolean;
  autoCommand?: string;
}

export const Terminal = React.forwardRef<{ focus: () => void }, TerminalProps>(({
  terminalId: providedTerminalId,
  workingDirectory,
  name,
  isRestored,
  autoCommand
}, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(providedTerminalId || null);
  
  // Event listener cleanup functions
  const unlistenOutputRef = useRef<UnlistenFn | null>(null);
  const unlistenClosedRef = useRef<UnlistenFn | null>(null);
  
  // Store current terminal ID in ref for input handlers
  const currentTerminalIdRef = useRef<string | null>(terminalId);

  // Expose focus function to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (xtermRef.current) {
        xtermRef.current.focus();
      }
    }
  }));

  useEffect(() => {
    if (!terminalRef.current) {
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
    const webLinksAddon = new WebLinksAddon();
    
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    
    // Open terminal in DOM
    xterm.open(terminalRef.current);
    
    // Store references
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Fit terminal to container after a short delay
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.warn('Failed to fit terminal on initial load:', error);
      }
    }, 100);

    // Input handlers will be set up in setupEventListeners when we have a terminal ID

    // Don't create backend terminal here - WorktreeView handles that
    // Just wait for the terminal ID to be provided via props

    // Handle window resize
    const handleResize = () => {
      if (fitAddon && terminalId) {
        try {
          fitAddon.fit();
          const { cols, rows } = xterm;
          invoke('resize_terminal', { terminalId, cols, rows }).catch(console.error);
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
      
      // Cleanup XTerm
      xterm.dispose();
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

        // Handle special key combinations that XTerm doesn't handle by default
        xtermRef.current.onKey(({ domEvent }) => {
          const currentId = currentTerminalIdRef.current;
          if (currentId && domEvent.metaKey) { // Cmd key on Mac
            let specialKey = '';
            
            switch (domEvent.key) {
              case 'Backspace': // Cmd+Delete -> Clear line (Ctrl+U)
                specialKey = '\x15'; // Ctrl+U
                break;
              case 'ArrowLeft': // Cmd+Left -> Beginning of line (Ctrl+A)
                specialKey = '\x01'; // Ctrl+A
                break;
              case 'ArrowRight': // Cmd+Right -> End of line (Ctrl+E)
                specialKey = '\x05'; // Ctrl+E
                break;
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
    if (fitAddonRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch (error) {
        console.warn('Failed to fit terminal manually:', error);
      }
    }
  };

  return (
    <div className="w-full h-full">
      <div
        ref={terminalRef}
        className="w-full h-full"
        onClick={handleFit}
      />
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;