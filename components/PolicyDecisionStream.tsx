'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

/** What the product does, shown rather than described: applications on real
 *  endpoints asking for admin rights, and a policy answering each one.
 *
 *  The decisions below are illustrative — this is the signed-out page, there is
 *  no tenant to read real ones from, and inventing a live feed here would be a
 *  lie about what the viewer is looking at. */
type Decision = 'elevated' | 'blocked' | 'allowed';

interface Request {
  app: string;
  machine: string;
  user: string;
  decision: Decision;
  /** The rule that produced the decision — the part that makes this a policy
   *  engine rather than a prompt. */
  rule: string;
}

const REQUESTS: Request[] = [
  { app: 'Docker Desktop', machine: 'dev-laptop-04', user: 'priya', decision: 'elevated', rule: 'JIT · 15 min' },
  { app: 'regedit.exe', machine: 'fin-ws-11', user: 'a.khan', decision: 'blocked', rule: 'Registry tools' },
  { app: 'Zoom Installer', machine: 'sales-mbp-02', user: 'dan', decision: 'allowed', rule: 'Approved catalog' },
  { app: 'psexec.exe', machine: 'hr-ws-07', user: 'meera', decision: 'blocked', rule: 'Lateral movement' },
  { app: 'Wireshark', machine: 'net-ws-01', user: 'arjun', decision: 'elevated', rule: 'Network team' },
];

const DECISION_STYLE: Record<Decision, { label: string; icon: typeof ShieldCheck; className: string; dot: string }> = {
  elevated: {
    label: 'Elevated',
    icon: ShieldAlert,
    className: 'text-warning border-warning/30 bg-warning/10',
    dot: 'bg-warning',
  },
  blocked: {
    label: 'Blocked',
    icon: ShieldX,
    className: 'text-destructive border-destructive/30 bg-destructive/10',
    dot: 'bg-destructive',
  },
  allowed: {
    label: 'Allowed',
    icon: ShieldCheck,
    className: 'text-success border-success/30 bg-success/10',
    dot: 'bg-success',
  },
};

export function PolicyDecisionStream() {
  const [visible, setVisible] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Rows arrive one at a time, then the whole list clears and starts over, so
  // somebody who sits on the login page for a minute does not stare at a
  // finished list.
  useEffect(() => {
    const id = setInterval(() => {
      setVisible((n) => (n >= REQUESTS.length ? 0 : n + 1));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  // Follow the newest row down. The panel is a fixed height, so without this
  // each arrival after the fourth would land below the fold and the animation
  // would look like it had stopped.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: visible === 0 ? 0 : el.scrollHeight, behavior: visible === 0 ? 'auto' : 'smooth' });
  }, [visible]);

  return (
    <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-5 mt-10 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Cpu className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium">Elevation requests</span>
        <motion.div
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="ml-auto flex items-center gap-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-success/80">Policy active</span>
        </motion.div>
      </div>

      {/* Rows. A FIXED height, not a minimum: the list has to overflow inside
          this box and scroll, or the panel grows with every arriving row and
          pushes the rest of the page down the screen. */}
      <div ref={listRef} className="h-[228px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {REQUESTS.slice(0, visible).map((req) => {
            const style = DECISION_STYLE[req.decision];
            return (
              <motion.div
                key={req.app}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/70 px-3 py-2.5"
              >
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{req.app}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {req.user} · {req.machine}
                  </p>
                </div>
                <span className="hidden text-[11px] text-muted-foreground sm:inline">{req.rule}</span>
                <span
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    style.className,
                  )}
                >
                  <style.icon className="h-3 w-3" />
                  {style.label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Scanning line while the next decision is pending — the visual
            equivalent of "evaluating", so the gap between rows reads as work
            rather than as the animation having stopped. */}
        {visible < REQUESTS.length && (
          <motion.div
            className="h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
    </div>
  );
}
