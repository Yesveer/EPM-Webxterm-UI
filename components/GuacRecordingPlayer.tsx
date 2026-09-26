'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Pause } from 'lucide-react';

/**
 * Plays a raw Guacamole session recording (.guac) using guacamole-common-js's built-in
 * SessionRecording player — a frame-accurate replay of the desktop session (looks like
 * video). No server-side encoding (guacenc) needed. `src` is a presigned URL to the
 * recording blob in S3.
 */
export default function GuacRecordingPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0); // ms
  const [position, setPosition] = useState(0); // ms

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const Guacamole: any = (await import('guacamole-common-js')).default ?? (await import('guacamole-common-js'));
        const resp = await fetch(src);
        if (!resp.ok) throw new Error('Failed to download recording');
        // The recording is text (the Guacamole protocol). Read as text so we can feed it
        // through the parser below.
        const text = await resp.text();
        if (cancelled) return;

        // guacamole-common-js 1.5.0's SessionRecording is BROKEN when given a Blob (its
        // Blob branch never assigns the internal blob → "reading 'size' of undefined").
        // The tunnel branch works: pass a fake tunnel object, then feed the recording's
        // instructions into the tunnel handler ourselves via Guacamole.Parser.
        const fakeTunnel: any = {};
        const recording = new Guacamole.SessionRecording(fakeTunnel);
        recRef.current = recording;

        const display = recording.getDisplay();
        const el = display.getElement();
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(el);
        }

        const fit = () => {
          const box = containerRef.current?.getBoundingClientRect();
          const w = display.getWidth();
          const h = display.getHeight();
          if (box && box.width > 0 && box.height > 0 && w > 0 && h > 0) {
            display.scale(Math.min(box.width / w, box.height / h));
          }
        };
        display.onresize = () => fit();

        recording.onprogress = (dur: number) => setDuration(dur);
        recording.onplay = () => setPlaying(true);
        recording.onpause = () => setPlaying(false);
        recording.onseek = (pos: number) => setPosition(pos);

        // Feed the whole recording through the (fake) tunnel the recording is listening on.
        const parser = new Guacamole.Parser();
        parser.oninstruction = (op: string, args: string[]) => {
          if (fakeTunnel.oninstruction) fakeTunnel.oninstruction(op, args);
        };
        parser.receive(text);
        // Signal end-of-stream so the recording finalises and marks itself loaded.
        if (fakeTunnel.onstatechange) fakeTunnel.onstatechange(Guacamole.Tunnel.State.CLOSED);

        setLoading(false);
        // Auto-play from the start.
        setTimeout(() => { try { recording.play(); } catch { /* ignore */ } }, 300);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Could not load recording');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try { recRef.current?.pause?.(); } catch { /* ignore */ }
    };
  }, [src]);

  const togglePlay = () => {
    const r = recRef.current;
    if (!r) return;
    if (playing) r.pause();
    else r.play();
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const r = recRef.current;
    if (!r) return;
    const pos = Number(e.target.value);
    setPosition(pos);
    const wasPlaying = playing;
    r.pause();
    r.seek(pos, () => { if (wasPlaying) r.play(); });
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      <div className="relative w-full bg-black rounded-md overflow-hidden" style={{ minHeight: 360 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 z-10">
            <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Loading recording…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 z-10 px-6 text-center">
            {error}
          </div>
        )}
        <div ref={containerRef} className="w-full flex items-center justify-center max-h-[70vh] overflow-hidden" />
      </div>
      {!loading && !error && (
        <div className="flex items-center gap-3 mt-3">
          <button onClick={togglePlay} className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">{fmt(position)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={position}
            onChange={onSeek}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground tabular-nums">{fmt(duration)}</span>
        </div>
      )}
    </div>
  );
}
