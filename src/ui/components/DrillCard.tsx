import { useState } from 'preact/hooks';
import type { Drill, Move, Setup } from '../../content/types';
import { profile } from '../state';
import { byId } from '../../content/load';
import { Icon } from '../../design/icons';
import { TableDiagram } from '../../design/components';
import { common, drillText as T, phaseNames, regularityNames, setupNames } from '../../strings/en';

/** Pick the best variant for the player's setups (order = preference). */
export function pickVariant(drill: Drill, setups: Setup[]) {
  for (const s of setups) {
    const v = drill.variants.find((x) => x.setup === s);
    if (v) return v;
  }
  return drill.variants[0]!;
}

/**
 * The move to watch for a drill that covers several moves: the player's own moves first,
 * then moves for the skills this drill is meant to train, then any move except the ready stance.
 */
export function watchMove(drill: Drill, focusSkills: string[] = []): Move | undefined {
  const ms = drill.moveIds.map((m) => byId.move.get(m)).filter((m): m is Move => !!m?.animationId);
  // the drill's own main skills count too (e.g. "keeps your forehand drive sharp")
  focusSkills = [...focusSkills, ...[...drill.skills].sort((a, b) => b.weight - a.weight).map((x) => x.id)];
  const mine = new Set((profile.value?.moves ?? []).map((m) => m.id));
  return (
    ms.find((m) => mine.has(m.id) && focusSkills.includes(m.skillId)) ??
    ms.find((m) => focusSkills.includes(m.skillId)) ??
    ms.find((m) => mine.has(m.id)) ??
    ms.find((m) => m.id !== 'ready-stance') ??
    ms[0]
  );
}

export function DrillCard({
  drill,
  setups = ['multiball', 'partner', 'robot', 'wall', 'shadow'],
  minutes,
  target,
  reason,
  hand = 'R',
  compact,
  headingLevel = 3,
  focusSkills = [],
}: {
  drill: Drill;
  setups?: Setup[];
  minutes?: number;
  target?: string;
  reason?: string;
  hand?: 'R' | 'L';
  compact?: boolean;
  headingLevel?: 1 | 2 | 3;
  /** Skills this drill is meant to train here (picks which move to watch). */
  focusSkills?: string[];
}) {
  const H = `h${headingLevel}` as 'h3';
  const usable = drill.variants.filter((v) => setups.includes(v.setup));
  const [setup, setSetup] = useState<Setup>(pickVariant(drill, setups).setup);
  const variant = drill.variants.find((v) => v.setup === setup) ?? drill.variants[0]!;
  const animated = watchMove(drill, focusSkills);
  return (
    <article class={`drill${compact ? ' drill--compact' : ''}`}>
      {!compact ? (
        <div class="drill__meta">
          <span class="tag">{phaseNames[drill.phase]}</span>
          <span class="tag">{regularityNames[drill.regularity]}</span>
          <span class="tag">
            <Icon name="timer" size={16} />
            {T.minutes(minutes ?? drill.duration.default)}
          </span>
          {drill.impact === 'high' ? <span class="tag tag--warn">{T.highImpact}</span> : null}
        </div>
      ) : drill.impact === 'high' ? (
        <div class="drill__meta">
          <span class="tag tag--warn">{T.highImpact}</span>
        </div>
      ) : null}
      <H class="drill__name">{drill.name}</H>
      <p class="drill__purpose">{drill.purpose}</p>
      {reason ? (
        <p class="drill__why">
          <strong>{T.why}: </strong>
          {reason}
        </p>
      ) : null}

      {usable.length > 1 ? (
        <div class="drill__setups" role="tablist" aria-label={T.otherSetups}>
          {usable.map((v) => (
            <button
              type="button"
              role="tab"
              aria-selected={v.setup === setup}
              class={`seg${v.setup === setup ? ' is-on' : ''}`}
              onClick={() => setSetup(v.setup)}
            >
              {setupNames[v.setup]}
            </button>
          ))}
        </div>
      ) : (
        <p class="drill__setup-one">{setupNames[variant.setup]}</p>
      )}

      <div class="drill__body">
        <div class="drill__text">
          <p>{variant.instructions}</p>
          {variant.feederInstructions ? (
            <div class="note">
              <span class="note__who">{T.feeder}</span>
              <p>{variant.feederInstructions}</p>
            </div>
          ) : null}
        </div>
        {drill.diagram && variant.setup !== 'shadow' ? <TableDiagram placements={drill.diagram.placements} hand={hand} /> : null}
      </div>

      <div class="drill__target">
        <Icon name="goal" size={26} />
        <div>
          <span class="drill__label">{T.target}</span>
          <p>{target ?? drill.success.description}</p>
        </div>
      </div>

      {!compact ? (
        <div class="drill__points">
          <span class="drill__label">{T.coachingPoints}</span>
          <ol class="balls">
            {drill.coachingPoints.map((p) => (
              <li>{p}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {animated ? (
        <a class="btn btn--quiet drill__watch" href={`#/learn/${animated.id}`}>
          <Icon name="watch" size={22} />
          <span>{common.watchMove(animated.name)}</span>
        </a>
      ) : null}
    </article>
  );
}
