import { useState } from 'preact/hooks';
import { content } from '../../content/load';
import { Button } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { common, levelNames, serveLabText as T } from '../../strings/en';
import { hitsOf, ROUND, targetFor, zoneOf, type LandingZone, type ServeTarget } from '../../engine/serveLab';
import type { ServeLabEntry } from '../../storage/schema';
import { data, profile, saveServeLab, today } from '../state';
import { back } from '../router';
import { Dialog, OptionRow, Segmented } from '../components/Controls';
import { MoveViewer } from '../components/MoveViewer';

const serves = () => content.moves.filter((m) => m.id.startsWith('serve-')).sort((a, b) => a.levelMin - b.levelMin || a.id.localeCompare(b.id));

type Landing = { x: number; y: number; zone: LandingZone };

export function ServeLab() {
  const level = profile.value?.level ?? 1;
  const list = serves();
  const firstFit = list.find((m) => m.levelMin <= level) ?? list[0]!;
  const [serveId, setServeId] = useState(firstFit.id);
  const [target, setTarget] = useState<ServeTarget>('short');
  const [landings, setLandings] = useState<Landing[] | null>(null); // null = not playing
  const [finished, setFinished] = useState<ServeLabEntry | null>(null);
  const [watching, setWatching] = useState(false);
  const move = list.find((m) => m.id === serveId)!;

  const add = (l: Landing) => {
    if (!landings) return;
    const next = [...landings, l];
    if (next.length < ROUND) {
      setLandings(next);
      return;
    }
    const entry: ServeLabEntry = { id: `r${Date.now().toString(36)}`, date: today.value, serveId, target, landings: next };
    saveServeLab(entry);
    setLandings(null);
    setFinished(entry);
  };

  if (landings) {
    const i = landings.length;
    const aim = targetFor(target, i);
    return (
      <div class="screen screen--bare">
        <Backdrop variant="session" />
        <div class="topbar">
          <Button kind="ghost" icon="close" label={T.quit} onClick={() => setLandings(null)} />
          <span class="topbar__title num">{T.serveN(i + 1, ROUND)}</span>
          <span />
        </div>
        <div class="stack">
          <p class="serve-aim">{T.aimFor(T.zoneNames[aim]!)}</p>
          <ServeTable landings={landings} target={target} aim={aim} onTap={(x, y) => add({ x, y, zone: zoneOf(x, y) })} />
          <p class="muted" aria-hidden="true">
            {T.tapHint}
          </p>
          <div class="serve-zones" role="group" aria-label={T.orPick}>
            <Button kind="quiet" onClick={() => add({ x: 0.5, y: 1 / 6, zone: 'short' })}>
              {T.zoneNames.short}
            </Button>
            <Button kind="quiet" onClick={() => add({ x: 0.5, y: 0.5, zone: 'half' })}>
              {T.zoneNames.half}
            </Button>
            <Button kind="quiet" onClick={() => add({ x: 0.5, y: 5 / 6, zone: 'long' })}>
              {T.zoneNames.long}
            </Button>
            <Button kind="quiet" onClick={() => add({ x: -1, y: -1, zone: 'out' })}>
              {T.net}
            </Button>
          </div>
          <Button kind="ghost" icon="back" disabled={!i} onClick={() => setLandings(landings.slice(0, -1))}>
            {T.undo}
          </Button>
          <p class="sr-only" aria-live="polite">
            {i ? `${T.serveN(i, ROUND)}: ${T.zoneNames[landings[i - 1]!.zone]}, ${landings[i - 1]!.zone === targetFor(target, i - 1) ? T.hit : T.miss}` : ''}
          </p>
        </div>
      </div>
    );
  }

  const rounds = data.value.serveLab;
  return (
    <div class="screen screen--bare">
      <Backdrop variant="session" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/progress')} />
      </div>
      <div class="stack stack--l">
        <div class="stack stack--s">
          <h1>{T.title}</h1>
          <p class="muted">{T.intro}</p>
        </div>

        {finished ? (
          <section class="hero" aria-live="polite">
            <span class="hero__eyebrow">{T.done}</span>
            <h2 class="num">{T.score(hitsOf(finished), ROUND)}</h2>
            <span>{T.best(Math.max(...rounds.filter((r) => r.serveId === finished.serveId && r.target === finished.target).map(hitsOf)))}</span>
          </section>
        ) : null}

        <fieldset class="stack stack--s">
          <legend class="field__label">{T.pickServe}</legend>
          {list.map((m) => (
            <OptionRow title={m.name} sub={levelNames[m.levelMin]} selected={serveId === m.id} onClick={() => setServeId(m.id)} />
          ))}
        </fieldset>
        <Button kind="quiet" icon="watch" onClick={() => setWatching(true)}>
          {T.watch}
        </Button>

        <div class="stack stack--s">
          <span class="field__label">{T.target}</span>
          <Segmented
            label={T.target}
            value={target}
            onChange={setTarget}
            options={[
              { value: 'short', label: T.short },
              { value: 'half', label: T.half },
              { value: 'long', label: T.long },
              { value: 'mixed', label: T.mixed },
            ]}
          />
          <span class="field__hint">{T.targetHelp[target]}</span>
        </div>

        <Button wide big icon="play" onClick={() => (setFinished(null), setLandings([]))}>
          {finished ? T.again : T.start}
        </Button>

        <section class="stack">
          <h2 class="section-title">{T.history}</h2>
          {rounds.length ? <History rounds={rounds} /> : <p class="muted">{T.noHistory}</p>}
        </section>
      </div>
      {watching && move.animationId ? (
        <Dialog
          open
          title={move.name}
          onClose={() => setWatching(false)}
          actions={
            <Button kind="quiet" onClick={() => setWatching(false)}>
              {common.close}
            </Button>
          }
        >
          <MoveViewer animationId={move.animationId} />
        </Dialog>
      ) : null}
    </div>
  );
}

/** Last scores per serve and target, as small bars (oldest left). */
function History({ rounds }: { rounds: ServeLabEntry[] }) {
  const groups = new Map<string, ServeLabEntry[]>();
  for (const r of [...rounds].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const k = `${r.serveId}|${r.target}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return (
    <ul class="serve-history">
      {[...groups.entries()].map(([k, rs]) => {
        const [sid, target] = k.split('|') as [string, ServeTarget];
        const name = content.moves.find((m) => m.id === sid)?.name ?? sid;
        const scores = rs.slice(-8).map(hitsOf);
        return (
          <li class="serve-history__row">
            <span class="serve-history__name">
              {name} <span class="muted">· {T.zoneNames[target] ?? T.mixed}</span>
            </span>
            <span class="serve-history__bars" role="img" aria-label={T.trendLabel(name, scores)}>
              {scores.map((s) => (
                <span class="serve-history__bar" style={{ height: `${10 + s * 3.2}px` }} />
              ))}
            </span>
            <span class="serve-history__last num">{T.score(scores[scores.length - 1]!, ROUND)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Far half of the table, seen from the server: net at the bottom, end line at the top.
 *  Tapping outside the table counts as a miss. */
function ServeTable({ landings, target, aim, onTap }: { landings: Landing[]; target: ServeTarget; aim: 'short' | 'half' | 'long'; onTap: (x: number, y: number) => void }) {
  const M = 26; // margin around the table (taps here missed)
  const TW = 152.5;
  const TH = 137;
  const W = TW + 2 * M;
  const H = TH + 2 * M;
  const toSvg = (x: number, y: number) => [M + x * TW, M + (1 - y) * TH] as const;
  const third = TH / 3;
  // zone rectangles in svg units (net at the bottom)
  const zoneY = { long: M, half: M + third, short: M + 2 * third };
  return (
    <svg
      class="serve-table"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={T.tableLabel(landings.length)}
      onClick={(ev) => {
        // map the tap into viewBox units (correct even when the drawing is letterboxed)
        const svg = ev.currentTarget as SVGSVGElement;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const pt = svg.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        const p = pt.matrixTransform(ctm.inverse());
        onTap((p.x - M) / TW, 1 - (p.y - M) / TH);
      }}
    >
      <rect x="0" y="0" width={W} height={H} class="serve-table__floor" />
      <rect x={M} y={M} width={TW} height={TH} class="serve-table__surface" />
      <rect x={M} y={zoneY[aim]} width={TW} height={third} class="serve-table__target" />
      <path d={`M${M} ${M + third} H${M + TW} M${M} ${M + 2 * third} H${M + TW}`} class="serve-table__third" />
      <path d={`M${M + TW / 2} ${M} V${M + TH}`} class="serve-table__centre" />
      <rect x={M} y={M} width={TW} height={TH} class="serve-table__edge" />
      <path d={`M${M - 8} ${M + TH} H${M + TW + 8}`} class="serve-table__net" />
      <text x={M + TW / 2} y={M + TH + 17} text-anchor="middle" class="serve-table__label">
        {T.netLabel}
      </text>
      <text x={M + TW / 2} y={M - 9} text-anchor="middle" class="serve-table__label">
        {T.endLabel}
      </text>
      {landings.map((l, i) => {
        if (l.zone === 'out' && l.x < -0.5) return null; // "net or missed" has no spot
        const [cx, cy] = toSvg(Math.max(-0.15, Math.min(1.15, l.x)), Math.max(-0.15, Math.min(1.15, l.y)));
        const hit = l.zone === targetFor(target, i);
        return (
          <g class={`serve-table__dot${hit ? ' is-hit' : ''}`}>
            <circle cx={cx} cy={cy} r="7" />
            <text x={cx} y={cy + 3.5} text-anchor="middle">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
