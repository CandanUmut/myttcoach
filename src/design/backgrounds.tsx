/*
  Quiet backgrounds drawn from the table: the white edge line, the net's
  shadow, faint ball flights and blade ply stripes. One motif, small
  variations per screen. Always decorative (aria-hidden), never busy.
*/

export type BackdropVariant = 'today' | 'plan' | 'learn' | 'library' | 'progress' | 'settings' | 'session' | 'welcome';

export function Backdrop({ variant }: { variant: BackdropVariant }) {
  return (
    <div class={`backdrop backdrop--${variant}`} aria-hidden="true">
      <svg viewBox="0 0 390 320" preserveAspectRatio="xMidYMin slice" width="100%" height="100%">
        {variant === 'today' || variant === 'welcome' ? <TableCorner /> : null}
        {variant === 'plan' ? <PlyStripes /> : null}
        {variant === 'learn' ? <Flights count={3} /> : null}
        {variant === 'library' ? <NetShadow /> : null}
        {variant === 'progress' ? <Flights count={2} rising /> : null}
        {variant === 'settings' ? <PlyStripes vertical /> : null}
        {variant === 'session' ? <TableCorner big /> : null}
      </svg>
    </div>
  );
}

function TableCorner({ big = false }: { big?: boolean }) {
  // A corner of the table: surface tint, white edge line, faint centre line
  const y = big ? 60 : 150;
  return (
    <g>
      <path d={`M210 ${y} L390 ${y - 30} L390 320 L250 320 Z`} fill="var(--table)" opacity="0.045" />
      <path d={`M214 ${y + 4} L390 ${y - 25}`} stroke="var(--table)" stroke-width="3" opacity="0.18" fill="none" />
      <path d={`M218 ${y + 6} L252 318`} stroke="var(--table)" stroke-width="3" opacity="0.14" fill="none" />
      <path d={`M300 ${y - 10} L330 320`} stroke="var(--table)" stroke-width="1.2" opacity="0.12" stroke-dasharray="6 8" fill="none" />
      <path d={`M20 ${y + 120} Q150 ${y - 40} 300 ${y + 40}`} stroke="var(--accent)" stroke-width="1.5" opacity="0.22" stroke-dasharray="2 7" stroke-linecap="round" fill="none" />
      <circle cx="300" cy={y + 40} r="5" fill="var(--accent)" opacity="0.28" />
    </g>
  );
}

function PlyStripes({ vertical = false }: { vertical?: boolean }) {
  const colors = ['var(--c-blade)', 'var(--c-ply)', 'var(--c-blade)', 'var(--c-ply)', 'var(--c-blade)'];
  const widths = [10, 3, 16, 3, 10];
  let o = 0;
  return (
    <g opacity="0.22">
      {colors.map((c, i) => {
        const w = widths[i]!;
        const el = vertical ? (
          <rect x={372 - o - w} y={0} width={w} height={320} fill={c} />
        ) : (
          <rect x={0} y={o} width={390} height={w} fill={c} />
        );
        o += w;
        return el;
      })}
    </g>
  );
}

function Flights({ count, rising = false }: { count: number; rising?: boolean }) {
  const arcs = [
    'M-10 220 Q140 40 300 150',
    'M40 260 Q200 90 410 120',
    'M-20 160 Q120 20 260 90',
  ];
  return (
    <g fill="none" stroke="var(--accent)" stroke-linecap="round">
      {arcs.slice(0, count).map((d, i) => (
        <path d={rising ? d.replace('300 150', '330 60').replace('410 120', '420 30') : d} stroke-width="1.5" opacity={0.2 - i * 0.05} stroke-dasharray="2 8" />
      ))}
    </g>
  );
}

function NetShadow() {
  return (
    <g>
      <rect x="0" y="120" width="390" height="34" fill="var(--text)" opacity="0.035" />
      <path d="M0 120 H390" stroke="var(--text)" stroke-width="2" opacity="0.08" />
      {Array.from({ length: 40 }, (_, i) => (
        <path d={`M${i * 10} 120 V154`} stroke="var(--text)" stroke-width="0.7" opacity="0.05" />
      ))}
    </g>
  );
}
