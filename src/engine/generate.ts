import type { Content, Drill, Phase, Setup, StageId } from '../content/types';
import { STAGES } from '../content/types';
import { engineText as T, stageNames } from '../strings/en';
import { buildFocus, eligible, learnOrder } from './focus';
import { JOURNAL_SESSIONS, type JournalFocus } from './journal';
import { addDays, allowedRegularity, plannedDates, regularityBonus, weekThemes } from './periodize';
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
  /** Extra focus from the match journal. */
  journal?: JournalFocus;
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
  if (profile.ageBand === '65+' && (d.impact === 'high' || d.intensity >= 5)) return false;
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
  const days = [...new Set(profile.schedule.days)];
  const perWeek = Math.max(1, days.length);
  const total = profile.schedule.weeks * perWeek;

  // Match journal: the sessions right after the newest match each get one drill for what didn't work
  const journalDrillFor = (sid: string) => (d: Drill) =>
    available.has(d.phase) && drillFits(d, profile) && (!noTable || d.variants.some((v) => v.setup === 'shadow')) && (d.skills.find((x) => x.id === sid)?.weight ?? 0) >= 0.6;
  const jSkills = (state.journal?.skills ?? [])
    .filter((x) => {
      const sk = skills.get(x.id);
      return sk && eligible(sk, profile.level) && content.drills.some(journalDrillFor(x.id));
    })
    .slice(0, 2);
  const jWindow = new Map<number, number>(); // session index -> position in the window
  if (state.journal && jSkills.length && state.journal.from >= addDays(profile.schedule.startDate, -56)) {
    const dates = plannedDates(profile, total);
    for (let i = 0; i < total && jWindow.size < JOURNAL_SESSIONS; i++) if ((dates[i] ?? '') >= state.journal.from) jWindow.set(i, jWindow.size);
  }

  // Assessment: last session of every Apply week. When a tournament taper takes
  // the last week, its test moves to the end of the week before.
  const testWeeks = new Set<number>();
  {
    const raw = weekThemes({ ...profile, goals: profile.goals.filter((g) => g !== 'tournament') });
    raw.forEach((w, i) => {
      if (w.theme === 'apply') testWeeks.add(i);
    });
    const last = themes.length - 1;
    if (themes[last]?.theme === 'taper' && testWeeks.has(last)) {
      testWeeks.delete(last);
      if (last > 0) testWeeks.add(last - 1);
    }
  }

  // Swaps from adaptation, applied in time order: a later change can undo an earlier one
  const swapAt = (id: string, idx: number): string => {
    const map = new Map<string, string>();
    for (const c of state.changes) {
      if (c.atSession > idx) continue;
      map.set(c.fromDrillId, c.toDrillId);
      map.delete(c.toDrillId);
    }
    let cur = id;
    const seen = new Set([id]);
    while (map.has(cur)) {
      const nx = map.get(cur)!;
      const to = drills.get(nx);
      if (seen.has(nx) || !to || !drillFits(to, profile, 1)) break;
      seen.add(nx);
      cur = nx;
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
    // Without a table every move stops at the shadow stage, so all of them take turns
    if (noTable) return order.filter((m) => (stage[m] ?? 0) < 7);
    const act: string[] = [];
    for (const mid of order) {
      if ((stage[mid] ?? 0) >= 7) continue;
      const pre = skills.get(skillOfMove(mid) ?? '')?.prerequisites ?? [];
      const blocked = pre.some((p) => {
        const pm = order.find((x) => skillOfMove(x) === p);
        return pm && (stage[pm] ?? 0) < 3;
      });
      if (!blocked) act.push(mid);
      if (act.length >= 2) break;
    }
    return act;
  };

  const sessions: Session[] = [];
  const history: string[][] = [];
  const tipHistory: (string | null)[] = [];
  const useCount = new Map<string, number>();
  const lastUsed = new Map<string, number>();
  const past = opts.past ?? [];
  for (const s of past) {
    sessions.push(s);
    const ids = s.blocks.flatMap((b) => b.items.map((i) => i.drillId).filter((x): x is string => !!x));
    history.push(ids);
    tipHistory.push(s.tipId);
    for (const id of ids) {
      useCount.set(id, (useCount.get(id) ?? 0) + 1);
      lastUsed.set(id, s.index);
    }
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
      const focus = isFocusDrill(d);
      if (d.moveIds.some((m) => chosenMoves.has(m))) s += 1.5;
      if (!useCount.has(d.id)) s += 0.4;
      if (prev.has(d.id)) s -= focus ? 1.2 : 2;
      else if (recent2.has(d.id)) s -= focus ? 0.4 : 1.2;
      else if (recent4.has(d.id)) s -= focus ? 0 : 0.5;
      // focus drills come back every 2–3 sessions
      const lu = lastUsed.get(d.id);
      if (focus && lu !== undefined && idx - lu >= 3) s += 0.8;
      // Players with a table should use it: shadow-only drills are a last resort at the table
      if (!noTable && TABLE_PHASES.includes(d.phase) && !d.variants.some((v) => v.setup !== 'shadow' && setups.includes(v.setup))) s -= 2;
      s += regularityBonus(theme, d.regularity);
      if (profile.ageBand === '65+' && d.intensity >= 4) s -= 0.8;
      return s;
    };

    const candidates = (phase: Phase): Drill[] => {
      const regs = allowedRegularity(theme);
      const base = content.drills.filter((d) => d.phase === phase && !used.has(d.id) && (!noTable || d.variants.some((v) => v.setup === 'shadow')));
      const calm = (d: Drill) => theme !== 'taper' || d.intensity < 4;
      // Regular picks never leave the player's level. If nothing fits, the block's time goes elsewhere.
      const tries: ((d: Drill) => boolean)[] = [
        (d) => drillFits(d, profile) && calm(d) && regs.includes(d.regularity) && (!prev.has(d.id) || isFocusDrill(d)),
        (d) => drillFits(d, profile) && (!prev.has(d.id) || isFocusDrill(d)),
        (d) => drillFits(d, profile), // repeat at the right level rather than leave the level
      ];
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

    const pick = (phase: Phase, left: number): Drill | undefined => {
      // Adaptation swaps replace a drill everywhere in the future, before scoring
      const seen = new Set<string>();
      const c: Drill[] = [];
      for (const d of candidates(phase)) {
        const sw = drills.get(swapAt(d.id, idx))!;
        if (used.has(sw.id) || seen.has(sw.id)) continue;
        seen.add(sw.id);
        c.push(sw);
      }
      // prefer drills whose minimum fits the time left
      const fits = c.filter((d) => d.duration.min <= left);
      return pickBest(fits.length ? fits : c, score, rng);
    };

    /** Fill a block with drills, each within its own min..max. Returns minutes that found no drill. */
    const fill = (phase: Phase, minutes: number, items: DrillItem[]): number => {
      let left = minutes;
      for (let guard = 0; left > 0 && guard < 5; guard++) {
        const d = pick(phase, left);
        if (!d) break;
        let m = Math.min(d.duration.max, left);
        const rest = left - m;
        // don't leave a stub too short for another drill
        if (rest > 0 && rest < 3) m = m - (3 - rest) >= d.duration.min ? m - (3 - rest) : left;
        items.push(makeItem(d, phase, m));
        left -= m;
      }
      return left;
    };

    // ----- Learning slot: decided first so its drill is reserved -----
    const plan = allocate(profile, content, available, theme);
    const learnItems: DrillItem[] = [];
    let learnPhase: Phase | null = null;
    let learnNote: { move: string; stage: StageId; task: string; isNew: boolean } | null = null;
    const techMinutes = plan.find((b) => b.phase === 'technique')?.minutes ?? 0;
    if (!isTest && order.length && techMinutes >= 4) {
      const act = activeMoves();
      if (act.length) {
        const mid = act[rotation % act.length]!;
        rotation++;
        const st = Math.min(6, stage[mid] ?? 0);
        const stId = STAGES[st]!;
        const mv = moves.get(mid)!;
        const lp = mv.learningPath[st]!;
        if (stId === 'see') {
          learnPhase = 'technique';
          const learnMin = techMinutes >= 10 ? Math.round(techMinutes * 0.6) : techMinutes;
          const w = Math.min(3, learnMin);
          learnItems.push({
            kind: 'watch', drillId: null, setup: 'shadow', minutes: w, target: lp.passCheck, cue: mv.cues[0]!,
            reason: T.reasonWatch(mv.name), focus: true, learn: { moveId: mid, stage: 'see' },
          });
          const sh = drills.get('shadow-strokes');
          if (sh && learnMin - w >= sh.duration.min) {
            learnItems.push(makeItem(sh, 'technique', Math.min(sh.duration.max, learnMin - w), { reason: T.reasonLearn(mv.name, 2, stageLabel('shadow')), learn: { moveId: mid, stage: 'shadow' }, focus: true, target: mv.learningPath[1]!.passCheck }));
          }
        } else {
          let d = lp.drillIds.map((x) => drills.get(x)!).find((x) => drillFits(x, profile, 1) && (!noTable || x.variants.some((v) => v.setup === 'shadow')));
          let reason = T.reasonLearn(mv.name, st + 1, stageLabel(stId));
          if (!d) {
            d = drills.get('shadow-strokes');
            reason = T.reasonNoSetup(mv.name);
          }
          if (d) {
            const dd = drills.get(swapAt(d.id, idx)) ?? d;
            // the drill goes in the block of its own phase when the session has it, else technique
            learnPhase = plan.some((b) => b.phase === dd.phase) ? dd.phase : 'technique';
            const bm = plan.find((b) => b.phase === learnPhase)!.minutes;
            const want = bm >= 10 ? Math.round(bm * 0.6) : bm;
            const m = Math.max(Math.min(dd.duration.min, bm), Math.min(dd.duration.max, want));
            learnItems.push(makeItem(dd, learnPhase, m, { reason, learn: { moveId: mid, stage: stId }, focus: true, target: lp.passCheck }));
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
      }
    }

    // ----- Tests: reserved first so warm-ups don't take the same drill -----
    const testMinutes = plan.filter((b) => b.phase === 'technique' || b.phase === 'footwork').reduce((a, b) => a + b.minutes, 0);
    const tests = isTest ? pickTests().slice(0, Math.max(1, Math.floor(testMinutes / 5))) : [];
    for (const t of tests) used.add(t.testDrillId);

    // ----- Journal slot: one drill for what didn't work in the last match -----
    let journalItem: DrillItem | null = null;
    let journalPhase: Phase | null = null;
    const jPos = jWindow.get(idx);
    if (jPos !== undefined && !tests.length) {
      const phases = new Set(plan.map((b) => b.phase));
      const tryOrder = [jSkills[jPos % jSkills.length]!, ...jSkills];
      for (const sk of tryOrder) {
        const c = content.drills
          .filter((d) => phases.has(d.phase) && journalDrillFor(sk.id)(d) && (theme !== 'taper' || d.intensity < 4))
          .map((d) => drills.get(swapAt(d.id, idx))!)
          .filter((d) => !used.has(d.id));
        const d = pickBest(c, (dd) => score(dd) + (dd.skills.find((x) => x.id === sk.id)?.weight ?? 0), rng);
        if (!d) continue;
        const bm = plan.find((b) => b.phase === d.phase)!.minutes;
        const room = bm - (learnPhase === d.phase ? learnItems.reduce((a, li) => a + li.minutes, 0) : 0);
        if (room < d.duration.min) continue;
        const m = Math.min(room, d.duration.max, Math.max(d.duration.min, d.duration.default));
        journalPhase = d.phase;
        journalItem = makeItem(d, d.phase, m, { reason: T.reasonJournal(sk.because.join(', ')), fromJournal: sk.because, focus: true });
        break;
      }
    }

    // ----- Blocks -----
    const blocks: Block[] = [];
    let slack = 0;
    for (const b of plan) {
      const items: DrillItem[] = [];
      let minutes = b.minutes;
      if (tests.length && b.phase === 'footwork') continue; // its time is in the test block
      if (tests.length && b.phase === 'technique') {
        minutes = testMinutes;
        const n = tests.length;
        for (const t of tests) {
          const d = drills.get(t.testDrillId)!;
          const m = Math.min(minutes, Math.max(d.duration.min, Math.min(d.duration.max, Math.floor(testMinutes / n))));
          used.delete(d.id);
          items.push(makeItem(d, d.phase, m, { reason: T.reasonTest(t.name.toLowerCase()), metricId: t.id, focus: true }));
          minutes -= m;
        }
      }
      if (b.phase === learnPhase) {
        for (const li of learnItems) {
          const m = Math.min(li.minutes, minutes);
          items.push({ ...li, minutes: m });
          minutes -= m;
        }
      }
      if (journalItem && journalPhase === b.phase) {
        const m = Math.min(journalItem.minutes, minutes);
        items.push({ ...journalItem, minutes: m });
        minutes -= m;
      }
      if (minutes > 0) slack += fill(b.phase, minutes, items);
      const kept = items.filter((i) => i.minutes > 0);
      if (kept.length) blocks.push({ phase: b.phase, minutes: kept.reduce((a, i) => a + i.minutes, 0), items: kept });
    }

    // ----- Time fit: the session adds up exactly to the chosen length -----
    slack = profile.schedule.length - blocks.reduce((a, bl) => a + bl.minutes, 0);
    if (slack !== 0 && blocks.length) {
      const pref: Phase[] = ['technique', 'footwork', 'matchPlay', 'serve', 'receive', 'physical', 'tableWarmup', 'physicalWarmup', 'mental', 'cooldown'];
      const all = pref.flatMap((ph) => blocks.filter((bl) => bl.phase === ph).flatMap((bl) => bl.items.map((it) => ({ bl, it }))));
      const maxOf = (it: DrillItem) => (it.drillId ? drills.get(it.drillId)!.duration.max : 5);
      // first, into items that still have room
      for (const { bl, it } of all) {
        if (slack <= 0) break;
        const room = maxOf(it) - it.minutes;
        if (room <= 0) continue;
        const add = Math.min(room, slack);
        it.minutes += add;
        bl.minutes += add;
        slack -= add;
      }
      // then, if nothing has room, spread over the biggest items
      for (let k = 0; slack > 0 && all.length; k++) {
        const { bl, it } = all[k % all.length]!;
        it.minutes += 1;
        bl.minutes += 1;
        slack -= 1;
      }
      // over-full (negative slack can't happen, but keep the total exact)
      for (let k = all.length - 1; slack < 0 && k >= 0; k--) {
        const { bl, it } = all[k]!;
        const take = Math.min(it.minutes - 1, -slack);
        it.minutes -= take;
        bl.minutes -= take;
        slack += take;
      }
    }
    for (const bl of blocks) for (const it of bl.items) if (it.drillId) lastUsed.set(it.drillId, idx);

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
      if (noTable && !m.worksWithoutTable) continue;
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
