/*
  Design primitives. These carry the look: the ball-arc progress bar,
  the bounce stepper, ply-layer dividers and rubber-press buttons.
*/
import type { ComponentChildren, JSX } from 'preact';
import { Icon, type IconName } from './icons';
import { drillText } from '../strings/en';

/* ---------- Buttons ---------- */

type ButtonKind = 'primary' | 'strong' | 'quiet' | 'ghost' | 'danger';

export function Button({
  kind = 'primary',
  icon,
  children,
  big,
  wide,
  href,
  onClick,
  disabled,
  type = 'button',
  label,
  class: cls,
}: {
  kind?: ButtonKind;
  icon?: IconName;
  children?: ComponentChildren;
  big?: boolean;
  wide?: boolean;
  href?: string;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  label?: string;
  class?: string;
}) {
  const c = `btn btn--${kind}${big ? ' btn--big' : ''}${wide ? ' btn--wide' : ''}${!children ? ' btn--icon' : ''}${cls ? ` ${cls}` : ''}`;
  const inner = (
    <>
      {icon ? <Icon name={icon} size={big ? 28 : 22} /> : null}
      {children ? <span>{children}</span> : null}
    </>
  );
  if (href && !disabled) {
    return (
      <a class={c} href={href} aria-label={label} onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <button class={c} type={type} onClick={onClick} disabled={disabled} aria-label={label}>
      {inner}
    </button>
  );
}

/* ---------- Ball-arc progress: a ball flying over the net ---------- */

function quad(p0: number[], p1: number[], p2: number[], t: number) {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [a * p0[0]! + b * p1[0]! + c * p2[0]!, a * p0[1]! + b * p1[1]! + c * p2[1]!];
}

export function ArcProgress({
  value,
  max,
  label,
  compact,
}: {
  value: number;
  max: number;
  label?: string;
  compact?: boolean;
}) {
  const t = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const W = 300;
  const H = compact ? 44 : 64;
  const base = H - 8;
  const p0 = [10, base];
  const p1 = [W / 2, compact ? -14 : -24];
  const p2 = [W - 10, base];
  // Sub-curve 0..t via de Casteljau
  const q1 = [p0[0]! + (p1[0]! - p0[0]!) * t, p0[1]! + (p1[1]! - p0[1]!) * t];
  const end = quad(p0, p1, p2, t);
  const full = `M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;
  const done = `M${p0[0]} ${p0[1]} Q${q1[0]} ${q1[1]} ${end[0]} ${end[1]}`;
  const netTop = base - (compact ? 14 : 20);
  return (
    <div class="arc-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <path d={`M4 ${base + 4} H${W - 4}`} class="arc-progress__table" />
        <path d={`M${W / 2} ${base + 4} V${netTop}`} class="arc-progress__net" />
        <path d={full} class="arc-progress__track" />
        {t > 0 ? <path d={done} class="arc-progress__done" /> : null}
        <circle cx={end[0]} cy={end[1]} r={compact ? 6 : 7.5} class="arc-progress__ball" />
      </svg>
      {label ? <div class="arc-progress__label">{label}</div> : null}
    </div>
  );
}

/* ---------- Bounce stepper: each stage is a bounce on the table ---------- */

export function BounceStepper({
  steps,
  current,
  doneCount,
  onPick,
}: {
  steps: string[];
  current: number;
  doneCount?: number;
  onPick?: (i: number) => void;
}) {
  const n = steps.length;
  const W = 320;
  const H = 70;
  const base = 52;
  const xs = steps.map((_, i) => 18 + (i * (W - 36)) / Math.max(1, n - 1));
  const done = doneCount ?? current;
  return (
    <div class="bounce-stepper">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true">
        <path d={`M6 ${base + 8} H${W - 6}`} class="bounce-stepper__table" />
        {xs.slice(0, -1).map((x, i) => {
          const nx = xs[i + 1]!;
          const mid = (x + nx) / 2;
          return (
            <path
              d={`M${x} ${base} Q${mid} ${base - 38} ${nx} ${base}`}
              class={i < done ? 'bounce-stepper__arc is-done' : 'bounce-stepper__arc'}
            />
          );
        })}
        {xs.map((x, i) => (
          <g class={i === current ? 'bounce-stepper__dot is-current' : i < done ? 'bounce-stepper__dot is-done' : 'bounce-stepper__dot'}>
            <ellipse cx={x} cy={base + 7} rx={i === current ? 7 : 5} ry="1.6" class="bounce-stepper__shadow" />
            <circle cx={x} cy={base} r={i === current ? 8 : 6} />
          </g>
        ))}
      </svg>
      <p class="bounce-stepper__now">
        <strong>{steps[current]}</strong>, {drillText.stageOf(current + 1, n)}
      </p>
      <ol class="bounce-stepper__wide" aria-hidden="true">
        {steps.map((s, i) => (
          <li class={i === current ? 'is-current' : ''}>{s}</li>
        ))}
      </ol>
      <ol class="bounce-stepper__labels">
        {steps.map((s, i) => (
          <li class={i === current ? 'is-current' : i < done ? 'is-done' : ''}>
            {onPick ? (
              <button type="button" onClick={() => onPick(i)} aria-current={i === current ? 'step' : undefined}>
                {s}
              </button>
            ) : (
              <span aria-current={i === current ? 'step' : undefined}>{s}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Ply divider: blade layers ---------- */

export function PlyDivider() {
  return (
    <div class="ply" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

/* ---------- Chips and toggles ---------- */

export function Chip({
  children,
  selected,
  onClick,
  icon,
  rank,
}: {
  children: ComponentChildren;
  selected?: boolean;
  onClick?: () => void;
  icon?: IconName;
  rank?: number;
}) {
  return (
    <button type="button" class={`chip${selected ? ' is-selected' : ''}`} aria-pressed={selected ? 'true' : 'false'} onClick={onClick}>
      {rank ? <span class="chip__rank">{rank}</span> : icon ? <Icon name={icon} size={20} /> : null}
      <span>{children}</span>
    </button>
  );
}

/* ---------- Section heading ---------- */

export function Heading({ children, sub, level = 2 }: { children: ComponentChildren; sub?: ComponentChildren; level?: 1 | 2 | 3 }) {
  const H = `h${level}` as 'h1';
  return (
    <div class={`heading heading--${level}`}>
      <H>{children}</H>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

/* ---------- Table mini diagram ---------- */

export type Zone = 'fh' | 'mid' | 'bh' | 'elbow';
export function TableDiagram({
  placements,
  hand = 'R',
}: {
  placements: { zone: string; depth: 'short' | 'half' | 'long'; order: number }[];
  hand?: 'R' | 'L';
}) {
  // Top view, player at the bottom. Far half = opponent / feeder side.
  // Zones are from the player's view: fh = player's forehand side.
  const W = 160;
  const H = 260;
  const x0 = 12;
  const y0 = 10;
  const tw = W - 24;
  const th = H - 20;
  const zoneX = (z: string) => {
    const rightHanded = hand === 'R';
    const fhRight = rightHanded; // player's FH is on their right
    const map: Record<string, number> = { bh: 0.18, elbow: fhRight ? 0.62 : 0.38, mid: 0.5, fh: 0.82 };
    let f = map[z] ?? 0.5;
    if (!fhRight && (z === 'bh' || z === 'fh')) f = 1 - f;
    return x0 + tw * f;
  };
  const depthY = (d: string, side: 'far' | 'near') => {
    const f = d === 'short' ? 0.4 : d === 'half' ? 0.26 : 0.1;
    return side === 'far' ? y0 + th * f : y0 + th * (1 - f);
  };
  const pts = [...placements].sort((a, b) => a.order - b.order);
  return (
    <svg class="table-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={drillText.diagramLabel}>
      <rect x={x0} y={y0} width={tw} height={th} rx="3" class="table-diagram__surface" />
      <path d={`M${x0 + tw / 2} ${y0} V${y0 + th}`} class="table-diagram__centre" />
      <path d={`M${x0 - 6} ${y0 + th / 2} H${x0 + tw + 6}`} class="table-diagram__net" />
      {pts.slice(1).map((p, i) => {
        const prev = pts[i]!;
        return (
          <path
            d={`M${zoneX(prev.zone)} ${depthY(prev.depth, 'near')} L${zoneX(p.zone)} ${depthY(p.depth, 'near')}`}
            class="table-diagram__move"
          />
        );
      })}
      {pts.map((p, i) => {
        // Same spot used twice: nudge the second one so both numbers show
        const dup = pts.slice(0, i).filter((q) => q.zone === p.zone && q.depth === p.depth).length;
        const x = zoneX(p.zone) + dup * 14;
        const y = depthY(p.depth, 'near') - dup * 14;
        return (
          <g>
            <circle cx={x} cy={y} r="12" class="table-diagram__spot" />
            <text x={x} y={y + 4.5} class="table-diagram__num">
              {p.order}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
