import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  terminalId?: string;
  worktreeId: string;
  workingDirectory: string;
  name: string;
  onClose?: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  terminalId: providedTerminalId,
  worktreeId,
  workingDirectory,
  name,
  onClose
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(providedTerminalId || null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create XTerm instance
    const xterm = new XTerm({
      theme: {
        background: '#1e1e1e',
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

    // Fit terminal to container
    fitAddon.fit();

    // Handle data input from user
    xterm.onData(async (data) => {
      if (terminalId) {
        try {
          await invoke('write_to_terminal', { terminalId, data });
        } catch (error) {
          console.error('Failed to write to terminal:', error);
        }
      }
    });

    // Create backend terminal if not provided
    if (!providedTerminalId) {
      createBackendTerminal();
    } else {
      setIsConnected(true);
      startReadingFromTerminal();
    }

    // Handle window resize
    const handleResize = () => {
      if (fitAddon && terminalId) {
        fitAddon.fit();
        const { cols, rows } = xterm;
        invoke('resize_terminal', { terminalId, cols, rows }).catch(console.error);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalId) {
        invoke('close_terminal', { terminalId }).catch(console.error);
      }
      xterm.dispose();
    };
  }, []);

  const createBackendTerminal = async () => {
    try {
      const terminal = await invoke('create_terminal', {
        request: {
          worktreeId,
          name,
          workingDirectory
        }
      }) as { id: string };
      
      setTerminalId(terminal.id);
      setIsConnected(true);
      startReadingFromTerminal(terminal.id);
    } catch (error) {
      console.error('Failed to create terminal:', error);
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[31mFailed to create terminal session\x1b[0m\r\n');
      }
    }
  };

  const startReadingFromTerminal = (id?: string) => {
    const currentTerminalId = id || terminalId;
    if (!currentTerminalId || !xtermRef.current) return;

    // Set up periodic reading from terminal
    const readInterval = setInterval(async () => {
      try {
        const output = await invoke('read_from_terminal', { terminalId: currentTerminalId }) as string;
        if (output && xtermRef.current) {
          xtermRef.current.write(output);
        }
      } catch (error) {
        // Terminal might be closed or not ready, that's ok
        if (error && typeof error === 'string' && error.includes('Terminal not found')) {
          clearInterval(readInterval);
        }
      }
    }, 50); // Read every 50ms

    // Clean up interval when component unmounts
    return () => clearInterval(readInterval);
  };

  const handleClose = () => {
    if (terminalId) {
      invoke('close_terminal', { terminalId }).catch(console.error);
    }
    onClose?.();
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleFit = () => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-gray-700 rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d30] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-300 ml-2">{name}</span>
          {!isConnected && (
            <span className="text-xs text-yellow-500 ml-2">Connecting...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white"
            title="Close Terminal"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {!isMinimized && (
        <div className="flex-1 p-2">
          <div
            ref={terminalRef}
            className="w-full h-full"
            onClick={handleFit}
          />
        </div>
      )}
    </div>
  );
};

export default Terminal;


