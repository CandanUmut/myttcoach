import { useState } from 'preact/hooks';
import { content } from '../../content/load';
import { Button, Chip } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { common, spinText as T } from '../../strings/en';
import type { SpinSetting } from '../../content/types';
import { back } from '../router';
import { Segmented } from '../components/Controls';

const batText = (a: number) => (Math.abs(a) < 5 ? T.upright : a > 0 ? T.open(a) : T.closed(-a));

export function SpinHelper() {
  const sh = content.spinHelper;
  const [spin, setSpin] = useState(sh.spins[0]!.id);
  const [amount, setAmount] = useState<'light' | 'heavy'>('light');
  const [stroke, setStroke] = useState(sh.strokes[0]!.id);
  const cell = sh.cells.find((c) => c.stroke === stroke && c.spin === spin)!;
  const set: SpinSetting = spin === 'none' ? cell.light : cell[amount];
  const better = cell.better ? sh.strokes.find((s) => s.id === cell.better) : undefined;
  const strokeInfo = sh.strokes.find((s) => s.id === stroke)!;
  const moveId = cell.moveId ?? strokeInfo.moveId;
  const bat = batText(set.angle);
  const swing = T.swingDir(set.swing);
  return (
    <div class="screen screen--bare">
      <Backdrop variant="learn" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/learn')} />
      </div>
      <div class="stack stack--l">
        <div class="stack stack--s">
          <h1>{T.title}</h1>
          <p class="muted">{T.intro}</p>
        </div>

        <div class="stack stack--s">
          <span class="field__label">{T.incoming}</span>
          <Segmented label={T.incoming} value={spin} onChange={setSpin} options={sh.spins.map((s) => ({ value: s.id, label: s.name }))} />
          {spin !== 'none' ? (
            <Segmented
              label={T.amount}
              value={amount}
              onChange={setAmount}
              options={[
                { value: 'light', label: T.light },
                { value: 'heavy', label: T.heavy },
              ]}
            />
          ) : null}
        </div>

        <fieldset class="stack stack--s">
          <legend class="field__label">{T.stroke}</legend>
          <div class="row row--wrap">
            {sh.strokes.map((s) => (
              <Chip selected={stroke === s.id} onClick={() => setStroke(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <section class="spin-result" aria-live="polite">
          <SpinDiagram spin={spin} heavy={amount === 'heavy'} angle={set.angle} swing={set.swing} label={T.diagramLabel(bat, swing)} />
          <dl class="spin-facts">
            <div>
              <dt>{T.bat}</dt>
              <dd>{bat}</dd>
            </div>
            <div>
              <dt>{T.swing}</dt>
              <dd>{swing}</dd>
            </div>
          </dl>
          <p>{cell.note}</p>
          {better ? <p class="note">{T.better(better.name)}</p> : null}
          <p class="muted spin-small">{spin === 'sidespin' ? `${T.sidespinNote} ` : ''}{T.legend} {T.approx}</p>
          <Button kind="quiet" icon="watch" href={`#/learn/${moveId}`}>
            {common.watchMove(content.moves.find((m) => m.id === moveId)?.name ?? strokeInfo.name)}
          </Button>
        </section>
      </div>
    </div>
  );
}

/** Side view: you on the left, the ball coming from the right. Bat leans back when open. */
function SpinDiagram({ spin, heavy, angle, swing, label }: { spin: string; heavy: boolean; angle: number; swing: number; label: string }) {
  const bx = 112;
  const by = 92;
  const ball = { x: 212, y: 92, r: 13 };
  const rad = (swing * Math.PI) / 180;
  const vx = Math.cos(rad);
  const vy = -Math.sin(rad);
  const L = 70;
  const sx = bx - vx * L * 0.65;
  const sy = by - vy * L * 0.65;
  const ex = bx + vx * L * 0.45;
  const ey = by + vy * L * 0.45;
  // spin arrow: arc around the ball; topspin turns its top toward you (left), backspin away
  const ccw = spin === 'topspin';
  const arcR = ball.r + 7;
  const a0 = ccw ? -20 : 200;
  const a1 = ccw ? 200 : -20;
  const pt = (deg: number) => [ball.x + arcR * Math.cos((deg * Math.PI) / 180), ball.y - arcR * Math.sin((deg * Math.PI) / 180)] as const;
  const [p0x, p0y] = pt(a0);
  const [p1x, p1y] = pt(a1);
  return (
    <svg class="spin-diagram" viewBox="0 0 300 160" role="img" aria-label={label}>
      <rect x="0" y="0" width="300" height="160" class="spin-diagram__bg" />
      <path d="M0 132 H300" class="spin-diagram__table" />
      <path d="M286 132 V104" class="spin-diagram__net" />
      {/* ball and spin */}
      <circle cx={ball.x} cy={ball.y} r={ball.r} class="spin-diagram__ball" />
      <path d={`M${ball.x + 26} ${ball.y - 6} H${ball.x + 50}`} class="spin-diagram__travel" marker-end="url(#sh-arrow)" transform={`rotate(180 ${ball.x + 38} ${ball.y - 6})`} />
      {spin === 'topspin' || spin === 'backspin' ? (
        <path
          d={`M${p0x} ${p0y} A${arcR} ${arcR} 0 1 ${ccw ? 0 : 1} ${p1x} ${p1y}`}
          class={`spin-diagram__spin${heavy ? ' is-heavy' : ''}`}
          marker-end="url(#sh-arrow-spin)"
        />
      ) : spin === 'sidespin' ? (
        <ellipse cx={ball.x} cy={ball.y} rx={arcR} ry="6" class={`spin-diagram__spin${heavy ? ' is-heavy' : ''}`} />
      ) : null}
      {/* swing path */}
      <path d={`M${sx} ${sy} L${ex} ${ey}`} class="spin-diagram__swing" marker-end="url(#sh-arrow)" />
      {/* bat: rotate(-angle) leans the top back (open) or over the ball (closed) */}
      <g transform={`rotate(${-angle} ${bx} ${by})`}>
        <rect x={bx - 2} y={by + 24} width="5" height="20" rx="2" class="spin-diagram__handle" />
        <rect x={bx - 4} y={by - 30} width="8" height="56" rx="4" class="spin-diagram__blade" />
        <rect x={bx + 2} y={by - 30} width="3" height="56" rx="1.5" class="spin-diagram__face" />
      </g>
      <defs>
        <marker id="sh-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="spin-diagram__head" />
        </marker>
        <marker id="sh-arrow-spin" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="spin-diagram__spinhead" />
        </marker>
      </defs>
    </svg>
  );
}
