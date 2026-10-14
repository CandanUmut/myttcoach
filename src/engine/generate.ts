import type { Content, Drill, Phase, Setup, StageId } from '../content/types';
import { STAGES } from '../content/types';
import { engineText as T, stageNames } from '../strings/en';
import { buildFocus, learnOrder } from './focus';
import { allowedRegularity, regularityBonus, weekThemes } from './periodize';
import { fnv1a, mulberry32, pickBest, type Rng } from './prng';
import { programSeed } from './seed';
import { allocate } from './template';
import type { Block, Change, DrillItem, Profile, Program, Session, Week, WeekTheme } from './types';

export interface EngineState {
  /** Current stage index per learn move: 0..6, 7 = owned. */
  stageOf: Record<string, number>;
  /** Drill swaps from adaptation, oldest first. */
  changes: Change[];
  /** Skills of moves the player has already owned. */
  learnedSkills: string[];
}

export interface GenerateOptions {
  /** Sessions already done or in the past: kept exactly as they are. */
  past?: Session[];
  state?: EngineState;
}

const PER_STAGE: Record<StageId, number> = { see: 1, shadow: 2, feel: 2, groove: 2, mix: 2, use: 2, own: 1 };
const SETUP_PREF: Partial<Record<Phase, Setup[]>> = {
  technique: ['multiball', 'robot', 'partner', 'wall', 'shadow'],
  footwork: ['multiball', 'robot', 'partner', 'wall', 'shadow'],
  tableWarmup: ['partner', 'robot', 'multiball', 'wall', 'shadow'],
  serve: ['partner', 'multiball', 'robot', 'wall', 'shadow'],
  receive: ['partner', 'robot', 'multiball', 'wall', 'shadow'],
  matchPlay: ['partner', 'robot', 'multiball', 'wall', 'shadow'],
};
const DEFAULT_PREF: Setup[] = ['shadow', 'partner', 'multiball', 'robot', 'wall'];
const TABLE_PHASES: Phase[] = ['tableWarmup', 'technique', 'footwork', 'serve', 'receive', 'matchPlay'];

export function playerSetups(profile: Profile): Setup[] {
  const s = new Set<Setup>(profile.setups);
  s.add('shadow');
  return [...s];
}

export function isNoTable(profile: Profile): boolean {
  return playerSetups(profile).every((s) => s === 'shadow');
}

export function chooseSetup(d: Drill, phase: Phase, setups: Setup[]): Setup | null {
  const pref = SETUP_PREF[phase] ?? DEFAULT_PREF;
  for (const p of pref) if (setups.includes(p) && d.variants.some((v) => v.setup === p)) return p;
  return null;
}

/** Can this player do this drill at all? */
export function drillFits(d: Drill, profile: Profile, relaxLevel = 0): boolean {
  const L = profile.level;
  if (L < d.levelMin - relaxLevel || L > d.levelMax + relaxLevel) return false;
  if (profile.lowImpact && d.impact === 'high') return false;
  if (profile.ageBand === '65+' && d.intensity >= 5) return false;
  const setups = playerSetups(profile);
  return d.variants.some((v) => setups.includes(v.setup));
}

export function formatTarget(d: Drill, profile: Profile, block: number, theme: WeekTheme): { text: string; value?: number } {
  const s = d.success;
  const desc = s.description.replace(/\.$/, '');
  const lvl = Math.max(0, profile.level - d.levelMin);
  if (s.type === 'consecutive') {
    const f = 1 + 0.25 * lvl + 0.2 * block + (theme === 'build' ? 0.1 : 0);
    const n = Math.max(1, Math.round(s.target * f));
    return { text: /^\d+/.test(desc) ? desc.replace(/^\d+/, String(n)) : T.target.inARow(n), value: n };
  }
  if (s.type === 'outOf' && s.of && s.of >= 10 && s.target < s.of) {
    const n = Math.min(s.of - (s.of >= 20 ? 2 : 1), s.target + block + (lvl >= 2 ? 1 : 0));
    return { text: /^\d+ of \d+/.test(desc) ? desc.replace(/^\d+ of \d+/, T.target.outOf(n, s.of)) : T.target.outOf(n, s.of), value: n };
  }
  return { text: desc, value: s.target };
}

export function generateProgram(profile: Profile, content: Content, opts: GenerateOptions = {}): Program {
  const seed = programSeed(profile, content.version);
  const drills = new Map(content.drills.map((d) => [d.id, d]));
  const moves = new Map(content.moves.map((m) => [m.id, m]));
  const skills = new Map(content.skills.map((s) => [s.id, s]));
  const setups = playerSetups(profile);
  const noTable = isNoTable(profile);
  const state: EngineState = opts.state ?? { stageOf: {}, changes: [], learnedSkills: [] };

  const focus = buildFocus(profile, content, new Set(state.learnedSkills));
  const fw = new Map(focus.map((f) => [f.skillId, f.weight]));
  const topFocus = new Set(focus.filter((f) => !['physical', 'mental'].includes(skills.get(f.skillId)?.category ?? '')).slice(0, 3).map((f) => f.skillId));
  const order = learnOrder(profile, content, focus);
  const chosenMoves = new Set(profile.moves.map((m) => m.id));
  for (const id of order) chosenMoves.add(id);

  // Phases this player can train
  const available = new Set<Phase>();
  for (const d of content.drills) {
    if (!drillFits(d, profile)) continue;
    if (noTable && !content.templates.noTablePhases.includes(d.phase)) continue;
    if (noTable && !d.variants.some((v) => v.setup === 'shadow')) continue;
    available.add(d.phase);
  }

  const themes = weekThemes(profile);
  const testWeeks = new Set<number>();
  {
    const raw = weekThemes({ ...profile, goals: profile.goals.filter((g) => g !== 'tournament') });
    raw.forEach((w, i) => {
      if (w.theme === 'apply') testWeeks.add(i);
    });
  }
  const days = [...new Set(profile.schedule.days)];
  const perWeek = Math.max(1, days.length);
  const total = profile.schedule.weeks * perWeek;

  // Swap map from adaptation (later swaps override earlier ones)
  const swapAt = (id: string, idx: number): string => {
    let cur = id;
    for (let hop = 0; hop < 4; hop++) {
      const c = [...state.changes].reverse().find((x) => x.fromDrillId === cur && x.atSession <= idx);
      if (!c) break;
      const to = drills.get(c.toDrillId);
      if (!to || !drillFits(to, profile, 1)) break;
      cur = c.toDrillId;
    }
    return cur;
  };

  // Learning progress (planned pace, starting from the real current stages)
  const stage: Record<string, number> = {};
  const atStage: Record<string, number> = {};
  for (const m of order) {
    stage[m] = state.stageOf[m] ?? 0;
    atStage[m] = 0;
  }
  let rotation = 0;
  const skillOfMove = (mid: string) => moves.get(mid)?.skillId;
  const activeMoves = (): string[] => {
    const act: string[] = [];
    for (const mid of order) {
      if ((stage[mid] ?? 0) >= 7) continue;
      if (noTable) {
        act.push(mid); // without a table every move stays at the shadow stage
      } else {
        const pre = skills.get(skillOfMove(mid) ?? '')?.prerequisites ?? [];
        const blocked = pre.some((p) => {
          const pm = order.find((x) => skillOfMove(x) === p);
          return pm && (stage[pm] ?? 0) < 3;
        });
        if (!blocked) act.push(mid);
      }
      if (act.length >= 2) break;
    }
    return act;
  };

  const sessions: Session[] = [];
  const history: string[][] = [];
  const tipHistory: (string | null)[] = [];
  const useCount = new Map<string, number>();
  const past = opts.past ?? [];
  for (const s of past) {
    sessions.push(s);
    const ids = s.blocks.flatMap((b) => b.items.map((i) => i.drillId).filter((x): x is string => !!x));
    history.push(ids);
    tipHistory.push(s.tipId);
    for (const id of ids) useCount.set(id, (useCount.get(id) ?? 0) + 1);
  }

  for (let idx = past.length; idx < total; idx++) {
    const week = Math.floor(idx / perWeek);
    const { theme, block } = themes[week]!;
    const isTest = testWeeks.has(week) && idx % perWeek === perWeek - 1;
    const rng: Rng = mulberry32(seed ^ fnv1a(`s${idx}`));
    const used = new Set<string>();
    const prev = new Set(history[idx - 1] ?? []);
    const recent2 = new Set([...(history[idx - 1] ?? []), ...(history[idx - 2] ?? [])]);
    const recent4 = new Set([...(history[idx - 3] ?? []), ...(history[idx - 4] ?? [])]);

    const isFocusDrill = (d: Drill) => {
      const top = [...d.skills].sort((a, b) => b.weight - a.weight)[0];
      return (!!top && topFocus.has(top.id)) || d.moveIds.some((m) => chosenMoves.has(m));
    };
    const score = (d: Drill) => {
      // Σ(skill weight × focus weight), normalised so multi-skill drills don't win by size alone
      let s = 0;
      let wsum = 0;
      for (const sk of d.skills) {
        s += sk.weight * (fw.get(sk.id) ?? 0);
        wsum += sk.weight;
      }
      s /= Math.max(1, wsum);
      if (d.moveIds.some((m) => chosenMoves.has(m))) s += 1.5;
      if (!useCount.has(d.id)) s += 0.4;
      if (prev.has(d.id)) s -= isFocusDrill(d) ? 1.2 : 2;
      else if (recent2.has(d.id)) s -= isFocusDrill(d) ? 0.4 : 1.2;
      else if (recent4.has(d.id)) s -= isFocusDrill(d) ? 0 : 0.5;
      // Players with a table should use it: shadow-only drills are a last resort at the table
      if (!noTable && TABLE_PHASES.includes(d.phase) && !d.variants.some((v) => v.setup !== 'shadow' && setups.includes(v.setup))) s -= 2;
      s += regularityBonus(theme, d.regularity);
      if (theme === 'taper' && d.intensity >= 4) s -= 1;
      return s;
    };

    const candidates = (phase: Phase, strictOnly = false): Drill[] => {
      const regs = allowedRegularity(theme);
      const base = content.drills.filter((d) => d.phase === phase && !used.has(d.id) && (!noTable || d.variants.some((v) => v.setup === 'shadow')));
      const tries: ((d: Drill) => boolean)[] = [
        (d) => drillFits(d, profile) && regs.includes(d.regularity) && (!prev.has(d.id) || isFocusDrill(d)),
        (d) => drillFits(d, profile) && (!prev.has(d.id) || isFocusDrill(d)),
        (d) => drillFits(d, profile), // repeat at the right level rather than leave the level
      ];
      // Regular picks never leave the player's level. If nothing fits, the block's time goes elsewhere.
      void strictOnly;
      for (const t of tries) {
        const c = base.filter(t);
        if (c.length) return c;
      }
      return [];
    };

    const makeItem = (d: Drill, phase: Phase, minutes: number, extra: Partial<DrillItem> = {}): DrillItem => {
      const setup = chooseSetup(d, phase, noTable ? ['shadow'] : setups) ?? 'shadow';
      const tgt = formatTarget(d, profile, block, theme);
      const n = useCount.get(d.id) ?? 0;
      const cue = d.coachingPoints[n % d.coachingPoints.length]!;
      used.add(d.id);
      useCount.set(d.id, n + 1);
      return {
        kind: 'drill',
        drillId: d.id,
        setup,
        minutes,
        target: tgt.text,
        targetValue: tgt.value,
        cue,
        reason: extra.reason ?? reasonFor(d),
        focus: isFocusDrill(d),
        ...extra,
      };
    };

    const reasonFor = (d: Drill): string => {
      if (T.reasonPhase[d.phase]) return T.reasonPhase[d.phase]!;
      const mv = d.moveIds.find((m) => profile.moves.some((x) => x.id === m));
      if (mv) return T.reasonMove(moves.get(mv)!.name.toLowerCase());
      const top = [...d.skills].sort((a, b) => b.weight - a.weight)[0]!;
      if (topFocus.has(top.id)) return T.reasonFocus(skills.get(top.id)!.name.toLowerCase());
      if ((theme === 'apply' || theme === 'taper') && d.regularity === 'irregular') return T.reasonRandom;
      for (const gid of profile.goals) {
        const g = content.goals.find((x) => x.id === gid);
        if (g && g.skillWeights[top.id]) return T.reasonGoal(g.name);
      }
      return T.reasonKeep(skills.get(top.id)!.name);
    };

    const pick = (phase: Phase, strictOnly = false): Drill | undefined => {
      // Adaptation swaps replace a drill everywhere in the future, before scoring
      const seen = new Set<string>();
      const c: Drill[] = [];
      for (const d of candidates(phase, strictOnly)) {
        const sw = drills.get(swapAt(d.id, idx))!;
        if (used.has(sw.id) || seen.has(sw.id)) continue;
        seen.add(sw.id);
        c.push(sw);
      }
      return pickBest(c, score, rng);
    };

    const fill = (phase: Phase, minutes: number, items: DrillItem[]) => {
      let left = minutes;
      let guard = 0;
      while (left > 0 && guard < 3) {
        guard++;
        // a second drill in the same block must be at the player's level; otherwise the first one runs longer
        const d = pick(phase, items.length > 0);
        if (!d) break;
        const remainingAfter = left - d.duration.min;
        let m: number;
        if (left > d.duration.max && remainingAfter >= 3 && guard < 3) {
          m = Math.min(d.duration.max, Math.max(d.duration.min, Math.round(left * 0.55)));
        } else m = left;
        items.push(makeItem(d, phase, m));
        left -= m;
      }
      if (left > 0 && items.length) items[items.length - 1]!.minutes += left;
      return left > 0 && !items.length ? left : 0;
    };

    // Blocks
    const plan = allocate(profile, content, available, theme);
    const blocks: Block[] = [];
    let learnNote: { move: string; stage: StageId; task: string; isNew: boolean } | null = null;

    if (isTest) {
      const tests = pickTests();
      const testMinutes = plan.filter((b) => b.phase === 'technique' || b.phase === 'footwork').reduce((a, b) => a + b.minutes, 0);
      for (const b of plan) {
        if (b.phase === 'footwork' && tests.length) continue;
        if (b.phase === 'technique' && tests.length) {
          const items: DrillItem[] = [];
          const share = Math.floor(testMinutes / tests.length);
          tests.forEach((t, i) => {
            const d = drills.get(t.testDrillId)!;
            const m = i === tests.length - 1 ? testMinutes - share * (tests.length - 1) : share;
            items.push(makeItem(d, d.phase, m, { reason: T.reasonTest(t.name.toLowerCase()), metricId: t.id, focus: true }));
          });
          blocks.push({ phase: 'technique', minutes: testMinutes, items });
          continue;
        }
        const items: DrillItem[] = [];
        const rest = fill(b.phase, b.minutes, items);
        if (rest) continue;
        blocks.push({ phase: b.phase, minutes: b.minutes, items });
      }
    } else {
      for (const b of plan) {
        const items: DrillItem[] = [];
        let minutes = b.minutes;
        if (b.phase === 'technique' && order.length && minutes >= 4) {
          const act = activeMoves();
          if (act.length) {
            const mid = act[rotation % act.length]!;
            rotation++;
            const st = Math.min(6, stage[mid] ?? 0);
            const stId = STAGES[st]!;
            const mv = moves.get(mid)!;
            const lp = mv.learningPath[st]!;
            const learnMin = minutes >= 10 ? Math.round(minutes * 0.6) : minutes;
            if (stId === 'see') {
              const w = Math.min(3, learnMin);
              items.push({
                kind: 'watch', drillId: null, setup: 'shadow', minutes: w, target: lp.passCheck, cue: mv.cues[0]!,
                reason: T.reasonWatch(mv.name), focus: true, learn: { moveId: mid, stage: 'see' },
              });
              const sh = drills.get('shadow-strokes');
              if (sh && learnMin - w >= 2) {
                items.push(makeItem(sh, 'technique', learnMin - w, { reason: T.reasonLearn(mv.name, 2, stageLabel('shadow')), learn: { moveId: mid, stage: 'shadow' }, focus: true, target: mv.learningPath[1]!.passCheck }));
              } else if (learnMin - w > 0) items[0]!.minutes += learnMin - w;
            } else {
              let d = lp.drillIds.map((x) => drills.get(x)!).find((x) => drillFits(x, profile, 1) && !used.has(x.id) && (!noTable || x.variants.some((v) => v.setup === 'shadow')));
              let reason = T.reasonLearn(mv.name, st + 1, stageLabel(stId));
              if (!d) {
                d = drills.get('shadow-strokes');
                reason = T.reasonNoSetup(mv.name);
              }
              if (d) {
                const sw = swapAt(d.id, idx);
                const dd = drills.get(sw) ?? d;
                items.push(makeItem(dd, 'technique', learnMin, { reason, learn: { moveId: mid, stage: stId }, focus: true, target: lp.passCheck }));
              }
            }
            const isNew = (atStage[mid] ?? 0) === 0;
            learnNote = { move: mv.name, stage: stId, task: lp.task, isNew };
            // planned pace
            atStage[mid] = (atStage[mid] ?? 0) + 1;
            const cap = noTable ? 1 : 7; // no table: see, then shadow for good
            if ((atStage[mid] ?? 0) >= PER_STAGE[stId] && (stage[mid] ?? 0) < cap) {
              stage[mid] = (stage[mid] ?? 0) + 1;
              atStage[mid] = 0;
            }
            minutes -= items.reduce((a, i) => a + i.minutes, 0);
          }
        }
        if (minutes > 0) {
          const rest = fill(b.phase, minutes, items);
          if (rest && items.length) items[items.length - 1]!.minutes += rest;
          else if (rest && !items.length) continue;
        }
        if (items.length) blocks.push({ phase: b.phase, minutes: items.reduce((a, i) => a + i.minutes, 0), items });
      }
    }

    // Make sure the session adds up exactly (a dropped block gives its time to technique or the largest block)
    const sum = blocks.reduce((a, b) => a + b.minutes, 0);
    const diff = profile.schedule.length - sum;
    if (diff !== 0 && blocks.length) {
      const target = blocks.find((b) => b.phase === 'technique') ?? [...blocks].sort((a, b) => b.minutes - a.minutes)[0]!;
      target.minutes += diff;
      target.items[target.items.length - 1]!.minutes += diff;
    }

    // Focus skills of the session
    const skillMinutes = new Map<string, number>();
    for (const b of blocks)
      for (const it of b.items) {
        const d = it.drillId ? drills.get(it.drillId) : null;
        const sks = d ? d.skills : it.learn ? [{ id: moves.get(it.learn.moveId)!.skillId, weight: 1 }] : [];
        for (const s of sks) if (!['physical-prep'].includes(s.id)) skillMinutes.set(s.id, (skillMinutes.get(s.id) ?? 0) + s.weight * it.minutes * (fw.get(s.id) ?? 0.3));
      }
    const focusSkillIds = [...skillMinutes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([k]) => k);

    // Tip
    const recentTips = new Set(tipHistory.slice(-10).filter(Boolean) as string[]);
    const tipPool = content.tips.filter((t) => profile.level >= t.levelMin && profile.level <= t.levelMax && !recentTips.has(t.id));
    const tip = pickBest(tipPool, (t) => t.skills.reduce((a, s) => a + (skillMinutes.get(s) ?? 0), 0) + t.skills.reduce((a, s) => a + (fw.get(s) ?? 0) * 0.1, 0), rng);

    // Coach note
    const firstOfWeek = idx % perWeek === 0;
    const prevTheme = week > 0 ? themes[week - 1]!.theme : null;
    let noteKey: keyof typeof T.notes = 'focus';
    if (isTest) noteKey = 'test';
    else if (idx === 0) noteKey = 'welcome';
    else if (firstOfWeek && prevTheme !== theme) noteKey = theme;
    else if (learnNote && (learnNote as { isNew: boolean }).isNew) noteKey = 'stage';
    const ln = learnNote as { move: string; stage: StageId; task: string } | null;
    const coachNote = T.notes[noteKey][profile.voice]
      .replace('{name}', profile.name?.trim() || 'there')
      .replace('{move}', ln?.move ?? '')
      .replace('{stage}', ln ? stageLabel(ln.stage).toLowerCase() : '')
      .replace('{task}', ln?.task ?? '')
      .replace('{skill}', skills.get(focusSkillIds[0] ?? '')?.name.toLowerCase() ?? 'your strokes');

    const session: Session = {
      id: `s${idx}`,
      index: idx,
      week,
      weekTheme: theme,
      kind: isTest ? 'assessment' : 'training',
      length: profile.schedule.length,
      blocks,
      tipId: tip?.id ?? null,
      coachNote,
      focusSkillIds,
    };
    sessions.push(session);
    history.push(blocks.flatMap((b) => b.items.map((i) => i.drillId).filter((x): x is string => !!x)));
    tipHistory.push(session.tipId);
  }

  const weeks: Week[] = themes.map((t, i) => ({
    index: i,
    block: t.block,
    theme: t.theme,
    sessionIds: sessions.filter((s) => s.week === i).map((s) => s.id),
  }));

  return { seed, contentVersion: content.version, regenCount: profile.regenCount, focus, learnOrder: order, weeks, sessions, changes: state.changes };

  function pickTests() {
    const want: string[] = [];
    if (profile.goalMetric) want.push(profile.goalMetric.metricId);
    const ranked = [...content.metrics].sort((a, b) => (fw.get(b.skillId) ?? 0) - (fw.get(a.skillId) ?? 0) || a.id.localeCompare(b.id));
    for (const m of ranked) if (!want.includes(m.id)) want.push(m.id);
    const out = [];
    const seenDrill = new Set<string>();
    for (const id of want) {
      const m = content.metrics.find((x) => x.id === id);
      if (!m) continue;
      const d = drills.get(m.testDrillId);
      if (!d || !drillFits(d, profile, 1) || seenDrill.has(d.id)) continue;
      if (noTable && !d.variants.some((v) => v.setup === 'shadow')) continue;
      const sk = skills.get(m.skillId);
      if (sk && sk.levelMax < profile.level && !noTable && id !== profile.goalMetric?.metricId) continue;
      seenDrill.add(d.id);
      out.push(m);
      if (out.length >= 3) break;
    }
    return out;
  }
}

function stageLabel(s: StageId): string {
  return stageNames[s]!;
}
