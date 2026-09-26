'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XTerminalProps {
  onData: (data: string) => void;
  onConnect?: () => void;
  sessionId: string;
  theme?: 'dark' | 'light';
}

export function XTerminal({ onData, onConnect, sessionId, theme = 'dark' }: XTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance with black theme
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#e5e7eb',
        cursor: '#e5e7eb',
        cursorAccent: '#000000',
        black: '#000000',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e5e7eb',
        brightBlack: '#64748b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc',
      },
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal
    term.open(terminalRef.current);
    fitAddon.fit();

    // Handle data from user input
    term.onData((data) => {
      onData(data);
    });

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Notify connection
    if (onConnect) {
      onConnect();
    }

    // Handle window resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        fitAddon.fit();
      }, 100);
    };
    window.addEventListener('resize', handleResize);

    // Initial fit after a short delay
    setTimeout(() => fitAddon.fit(), 100);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, theme]); // Recreate on session or theme change

  // Expose write method via ref
  useEffect(() => {
    if (xtermRef.current) {
      // Store write function globally for this session
      (window as any)[`xterm_${sessionId}`] = {
        write: (data: string) => {
          xtermRef.current?.write(data);
        },
        clear: () => {
          xtermRef.current?.clear();
        },
      };
    }

    return () => {
      delete (window as any)[`xterm_${sessionId}`];
    };
  }, [sessionId]);

  // Expose fit method
  useEffect(() => {
    if (xtermRef.current && fitAddonRef.current) {
      (window as any)[`xterm_${sessionId}`] = {
        ...((window as any)[`xterm_${sessionId}`] || {}),
        fit: () => {
          setTimeout(() => {
            fitAddonRef.current?.fit();
          }, 50);
        },
      };
    }
  }, [sessionId]);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full"
      style={{ padding: '10px' }}
    />
  );
}
