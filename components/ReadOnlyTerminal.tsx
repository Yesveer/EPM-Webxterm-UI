'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { LogEntry } from '@/lib/machines-api';

interface ReadOnlyTerminalProps {
  logs: LogEntry[];
  sessionUsername?: string;
  machineName?: string;
}

export function ReadOnlyTerminal({
  logs,
  sessionUsername = 'user',
  machineName = 'machine',
}: ReadOnlyTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Mount once, create terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      disableStdin: true,
      cursorBlink: false,
      fontSize: 13,
      fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.45,
      scrollback: 50000,
      convertEol: true,
      allowProposedApi: true,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#c9d1d9',
        selectionBackground: '#388bfd33',
        black:         '#0d1117',
        red:           '#ff7b72',
        green:         '#3fb950',
        yellow:        '#d29922',
        blue:          '#58a6ff',
        magenta:       '#bc8cff',
        cyan:          '#39c5cf',
        white:         '#8b949e',
        brightBlack:   '#6e7681',
        brightRed:     '#ffa198',
        brightGreen:   '#56d364',
        brightYellow:  '#e3b341',
        brightBlue:    '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan:    '#56d4dd',
        brightWhite:   '#f0f6fc',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Small delay so DOM is ready before fitting
    setTimeout(() => {
      fitAddon.fit();
      writeAllLogs(term, logs, sessionUsername, machineName);
    }, 50);

    const onResize = () => { setTimeout(() => fitAddon.fit(), 50); };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When logs prop changes (refresh / page change), re-render
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.reset();
    fitAddonRef.current?.fit();
    writeAllLogs(term, logs, sessionUsername, machineName);
  }, [logs, sessionUsername, machineName]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '600px', overflow: 'hidden' }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function writeAllLogs(
  term: Terminal,
  logs: LogEntry[],
  username: string,
  machine: string,
) {
  if (logs.length === 0) {
    term.writeln('\x1b[90mNo commands logged for this session yet.\x1b[0m');
    return;
  }

  // Header
  term.writeln('\x1b[90m' + '─'.repeat(64) + '\x1b[0m');
  term.writeln(`\x1b[90m  Session replay · ${username}@${machine}\x1b[0m`);
  term.writeln('\x1b[90m' + '─'.repeat(64) + '\x1b[0m');
  term.writeln('');

  for (let index = 0; index < logs.length; index++) {
    const log = logs[index];
    // ── command line (only for first entry — rest are visible via PTY echo) ─
    if (index === 0) {
      term.writeln(`\x1b[1;32m$ \x1b[0m\x1b[1;97m${log.command}\x1b[0m`);
    }

    // ── raw PTY output ─────────────────────────────────────────────────────
    if (log.output) {
      term.write(log.output);
      term.write('\r\n');
    }
  }
}
