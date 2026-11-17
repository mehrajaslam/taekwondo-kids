import React from 'react';

export function BeltVisual({ color, dan, large = false }: { color: string; dan: number; large?: boolean }) {
  return (
    <div className="belt-bar" style={{ height: large ? 34 : 28, background: color }}>
      {dan > 0 && (
        <div style={{ position: 'absolute', right: 10, top: 0, bottom: 0, display: 'flex', gap: 3, alignItems: 'center' }}>
          {Array.from({ length: dan }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: '100%',
                background: '#facc15',
                display: 'block',
                borderLeft: '1px solid #a16207',
              }}
            />
          ))}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: '46%',
          top: '-4px',
          bottom: '-4px',
          width: 20,
          background: 'rgba(0,0,0,.18)',
          border: '2px solid rgba(0,0,0,.18)',
          borderRadius: 8,
          transform: 'rotate(4deg)',
        }}
      />
      <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 18, background: 'rgba(0,0,0,.14)' }} />
    </div>
  );
}
