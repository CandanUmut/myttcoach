import { STAGES, type Content, type Phase, type Setup, type StyleId } from './types';

const PHASES: Phase[] = ['physicalWarmup', 'tableWarmup', 'technique', 'footwork', 'serve', 'receive', 'matchPlay', 'physical', 'mental', 'cooldown'];
const SETUPS: Setup[] = ['partner', 'multiball', 'robot', 'wall', 'shadow'];
const STYLE_IDS: StyleId[] = ['closeAttacker', 'allRoundAttacker', 'midLooper', 'penholdAttacker', 'chopper', 'blocker', 'balanced'];

/** Returns a list of human-readable problems. Empty list = valid. */
export function validateContent(c: Content, animationIds: Set<string> = new Set()): string[] {
  const errs: string[] = [];
  const err = (m: string) => errs.push(m);

  const ids = <T extends { id: string }>(name: string, list: T[]) => {
    const s = new Set<string>();
    for (const x of list) {
      if (!x.id || !/^[a-z0-9-]+$/i.test(x.id)) err(`${name}: bad id "${x.id}"`);
      if (s.has(x.id)) err(`${name}: duplicate id "${x.id}"`);
      s.add(x.id);
    }
    return s;
  };
  const skills = ids('skill', c.skills);
  const moves = ids('move', c.moves);
  const drills = ids('drill', c.drills);
  const metrics = ids('metric', c.metrics);
  ids('tip', c.tips);
  ids('style', c.styles);
  ids('goal', c.goals);
  const drillMap = new Map(c.drills.map((d) => [d.id, d]));

  const lv = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;

  for (const s of c.skills) {
    if (!lv(s.levelMin) || !lv(s.levelMax) || s.levelMin > s.levelMax) err(`skill ${s.id}: bad level range`);
    for (const p of s.prerequisites) if (!skills.has(p)) err(`skill ${s.id}: prerequisite "${p}" not found`);
    for (const m of s.moveIds) if (!moves.has(m)) err(`skill ${s.id}: move "${m}" not found`);
    for (const k of Object.keys(s.styleWeights)) if (!STYLE_IDS.includes(k as StyleId)) err(`skill ${s.id}: unknown style "${k}"`);
  }
  // prerequisite cycles
  const seen = new Map<string, number>();
  const prereq = new Map(c.skills.map((s) => [s.id, s.prerequisites]));
  const visit = (id: string, path: string[]): void => {
    const st = seen.get(id);
    if (st === 2) return;
    if (st === 1) {
      err(`skill prerequisites form a cycle: ${[...path, id].join(' > ')}`);
      return;
    }
    seen.set(id, 1);
    for (const p of prereq.get(id) ?? []) visit(p, [...path, id]);
    seen.set(id, 2);
  };
  for (const s of c.skills) visit(s.id, []);

  for (const m of c.moves) {
    const sk = c.skills.find((s) => s.id === m.skillId);
    if (!sk) err(`move ${m.id}: skill "${m.skillId}" not found`);
    else if (!sk.moveIds.includes(m.id)) err(`move ${m.id}: not listed in skill ${sk.id}.moveIds`);
    if (!m.cues.length || m.cues.length > 3) err(`move ${m.id}: needs 1–3 cues`);
    const stages = m.learningPath.map((l) => l.stage);
    if (stages.join() !== STAGES.join()) err(`move ${m.id}: learning path must be ${STAGES.join(', ')} (got ${stages.join(', ')})`);
    for (const l of m.learningPath) {
      if (!l.task || !l.passCheck) err(`move ${m.id}/${l.stage}: task and passCheck required`);
      if (l.stage !== 'see' && l.drillIds.length === 0) err(`move ${m.id}/${l.stage}: needs at least one drill`);
      if (l.stage === 'shadow' && (l.selfChecks?.length ?? 0) !== 3) err(`move ${m.id}/shadow: needs exactly 3 self-checks`);
      for (const d of l.drillIds) {
        const dr = drillMap.get(d);
        if (!dr) err(`move ${m.id}/${l.stage}: drill "${d}" not found`);
        else if (dr.levelMax < m.levelMin) err(`move ${m.id}/${l.stage}: drill "${d}" is below the move's level`);
        else if (dr.levelMin > m.levelMin + 1) err(`move ${m.id}/${l.stage}: drill "${d}" starts too far above the move's level`);
      }
      if (l.stage === 'mix' && !l.drillIds.some((d) => drillMap.get(d)?.regularity === 'semiIrregular'))
        err(`move ${m.id}/mix: needs at least one semi-irregular drill`);
    }
    if (m.gamePatterns.length < 1) err(`move ${m.id}: needs at least 1 game pattern`);
    for (const g of m.gamePatterns) if (!drills.has(g.drillId)) err(`move ${m.id}: game pattern drill "${g.drillId}" not found`);
    if (m.troubleshooting.length < 3) err(`move ${m.id}: needs at least 3 troubleshooting entries`);
    for (const t of m.troubleshooting) {
      if (!drills.has(t.drillId)) err(`move ${m.id}: troubleshooting drill "${t.drillId}" not found`);
      if (!t.causes.length || !t.fixes.length) err(`move ${m.id}: troubleshooting "${t.symptom}" needs causes and fixes`);
    }
    for (const [k, v] of Object.entries(m.keyPoints)) if (!v) err(`move ${m.id}: key point "${k}" empty`);
    if (m.animationId && animationIds.size && !animationIds.has(m.animationId)) err(`move ${m.id}: animation "${m.animationId}" not found`);
  }

  for (const d of c.drills) {
    if (!lv(d.levelMin) || !lv(d.levelMax) || d.levelMin > d.levelMax) err(`drill ${d.id}: bad level range`);
    if (!PHASES.includes(d.phase)) err(`drill ${d.id}: unknown phase "${d.phase}"`);
    if (!d.variants.length) err(`drill ${d.id}: needs at least one variant`);
    const vs = new Set<string>();
    for (const v of d.variants) {
      if (!SETUPS.includes(v.setup)) err(`drill ${d.id}: unknown setup "${v.setup}"`);
      if (vs.has(v.setup)) err(`drill ${d.id}: two variants for "${v.setup}"`);
      vs.add(v.setup);
      if (!v.instructions) err(`drill ${d.id}/${v.setup}: instructions empty`);
    }
    if (!d.skills.length) err(`drill ${d.id}: needs at least one skill`);
    for (const s of d.skills) if (!skills.has(s.id)) err(`drill ${d.id}: skill "${s.id}" not found`);
    for (const m of d.moveIds) if (!moves.has(m)) err(`drill ${d.id}: move "${m}" not found`);
    const { min, default: def, max } = d.duration;
    if (!(min >= 1 && min <= def && def <= max)) err(`drill ${d.id}: duration must satisfy 1 <= min <= default <= max`);
    if (d.metricId && !metrics.has(d.metricId)) err(`drill ${d.id}: metric "${d.metricId}" not found`);
    for (const k of ['progressionId', 'regressionId', 'lowImpactId'] as const) {
      const ref = d[k];
      if (ref && !drills.has(ref)) err(`drill ${d.id}: ${k} "${ref}" not found`);
      if (ref === d.id) err(`drill ${d.id}: ${k} points to itself`);
    }
    if (d.impact === 'high') {
      if (!d.lowImpactId) err(`drill ${d.id}: high-impact drill needs a lowImpactId`);
      else if (drillMap.get(d.lowImpactId)?.impact !== 'low') err(`drill ${d.id}: lowImpactId must point to a low-impact drill`);
    }
    if (!d.coachingPoints.length || d.coachingPoints.length > 3) err(`drill ${d.id}: needs 1–3 coaching points`);
    if (d.success.target <= 0) err(`drill ${d.id}: success target must be positive`);
  }

  for (const m of c.metrics) {
    if (!drills.has(m.testDrillId)) err(`metric ${m.id}: test drill "${m.testDrillId}" not found`);
    if (!skills.has(m.skillId)) err(`metric ${m.id}: skill "${m.skillId}" not found`);
    for (const l of [1, 2, 3, 4, 5]) if (typeof (m.levelTargets as Record<number, number>)[l] !== 'number') err(`metric ${m.id}: missing level ${l} target`);
  }
  for (const t of c.tips) {
    for (const s of t.skills) if (!skills.has(s)) err(`tip ${t.id}: skill "${s}" not found`);
    if (t.levelMin > t.levelMax) err(`tip ${t.id}: bad level range`);
  }
  for (const id of STYLE_IDS) if (!c.styles.some((s) => s.id === id)) err(`styles: missing "${id}"`);
  for (const g of c.goals) {
    for (const k of Object.keys(g.skillWeights)) if (!skills.has(k)) err(`goal ${g.id}: skill "${k}" not found`);
    if (g.suggestedMetricId && !metrics.has(g.suggestedMetricId)) err(`goal ${g.id}: metric "${g.suggestedMetricId}" not found`);
  }
  // match journal: tags and opponent styles point at real skills
  ids('journal tag', c.journal.tags);
  ids('journal opponent', c.journal.opponents);
  for (const t of [...c.journal.tags, ...c.journal.opponents]) {
    if (!t.name) err(`journal ${t.id}: missing name`);
    for (const [k, v] of Object.entries(t.skillWeights)) {
      if (!skills.has(k)) err(`journal ${t.id}: skill "${k}" not found`);
      if (!(v > 0 && v <= 1)) err(`journal ${t.id}: weight for "${k}" must be in (0, 1]`);
    }
  }
  // spin helper: every stroke × spin has one cell with sane angles
  const sh = c.spinHelper;
  const strokeIds = ids('spin stroke', sh.strokes);
  ids('spin', sh.spins);
  for (const st of sh.strokes) if (!moves.has(st.moveId)) err(`spin stroke ${st.id}: move "${st.moveId}" not found`);
  for (const st of sh.strokes)
    for (const sp of sh.spins) {
      const n = sh.cells.filter((x) => x.stroke === st.id && x.spin === sp.id).length;
      if (n !== 1) err(`spin helper: ${st.id} × ${sp.id} has ${n} cells (needs 1)`);
    }
  for (const x of sh.cells) {
    if (!strokeIds.has(x.stroke) || !sh.spins.some((s) => s.id === x.spin)) err(`spin helper: unknown cell ${x.stroke} × ${x.spin}`);
    if (x.better && !strokeIds.has(x.better)) err(`spin helper ${x.stroke} × ${x.spin}: better "${x.better}" not found`);
    for (const v of [x.light, x.heavy]) {
      if (Math.abs(v.angle) > 80 || Math.abs(v.swing) > 90) err(`spin helper ${x.stroke} × ${x.spin}: angle out of range`);
    }
    if (!x.note) err(`spin helper ${x.stroke} × ${x.spin}: missing note`);
  }
  for (const t of c.templates.sessions) {
    const sum = t.blocks.reduce((a, b) => a + b.minutes, 0);
    if (sum !== t.length) err(`template ${t.length} min: blocks add up to ${sum}`);
    for (const b of t.blocks) if (!PHASES.includes(b.phase)) err(`template ${t.length}: unknown phase "${b.phase}"`);
  }
  for (const p of c.templates.dropPriority) if (!PHASES.includes(p)) err(`templates.dropPriority: unknown phase "${p}"`);
  return errs;
}
