'use client';

import { useState } from 'react';

const MESSAGE = 'ZEROCALL · WORLD CUP 2026 · PREDICT EVERY MATCH · BEAT THE AI · LOCK ON 0G';

export function AdBoard() {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className="ad-board py-1.5 mt-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="ad-board-track"
        style={paused ? { animationPlayState: 'paused' } : undefined}
      >
        {[0, 1].map((copy) => (
          <span key={copy} className="ad-board-copy">
            <span className="px-4">{MESSAGE}</span>
            <span className="px-4">{MESSAGE}</span>
            <span className="px-4">{MESSAGE}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
