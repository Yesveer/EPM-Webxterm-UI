'use client';

import { useEffect, useRef } from 'react';
import 'asciinema-player/dist/bundle/asciinema-player.css';

interface Props {
  src: string;
  cols?: number;
  rows?: number;
}

export default function AsciinemaPlayer({ src, cols = 220, rows = 50 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep a stable ref to the player instance so cleanup can always reach it,
  // even when the dispose call happens before the async import resolves.
  const playerRef = useRef<{ dispose?: () => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dispose any existing player (handles src changes and Strict Mode remounts)
    if (playerRef.current) {
      playerRef.current.dispose?.();
      playerRef.current = null;
    }

    // cancelled flag prevents the resolved promise from creating a player
    // if cleanup has already run (React Strict Mode double-invocation)
    let cancelled = false;

    import('asciinema-player').then((mod) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = mod.create(src, containerRef.current, {
        cols,
        rows,
        autoPlay: true,
        fit: 'width',
        theme: 'monokai',
        preload: true,
      });
    });

    return () => {
      cancelled = true;
      // If the import already resolved and player exists, dispose it now
      if (playerRef.current) {
        playerRef.current.dispose?.();
        playerRef.current = null;
      }
    };
  }, [src, cols, rows]);

  return <div ref={containerRef} className="w-full" />;
}
