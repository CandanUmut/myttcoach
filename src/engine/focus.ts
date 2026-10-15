import type { Content, Skill } from '../content/types';
import type { FocusEntry, Profile } from './types';
import { engineText } from '../strings/en';

const RANK = [1, 0.7, 0.5];
const LEARN_BONUS = 4;
const IMPROVE_BONUS = 2.5;
const BASE = 0.3;

/** A prerequisite counts as known when the player is above the level where it is introduced. */
export function prereqKnown(skill: Skill, level: number, learned: Set<string>): boolean {
  if (learned.has(skill.id)) return true;
  return level > skill.levelMin;
}

export function eligible(skill: Skill, level: number): boolean {
  if (skill.category === 'physical' || skill.category === 'mental') return true;
  return skill.levelMin <= level + 1 && skill.levelMax >= level;
}

/**
 * Turn goals, chosen moves and style into a weighted skill list.
 * Missing prerequisites of focus skills are added with a plain reason.
 */
export function buildFocus(profile: Profile, content: Content, learnedSkills: Set<string> = new Set()): FocusEntry[] {
  const skills = new Map(content.skills.map((s) => [s.id, s]));
  const w = new Map<string, number>();
  const chosen = new Set<string>();
  for (const s of content.skills) if (eligible(s, profile.level)) w.set(s.id, BASE);

  profile.goals.slice(0, 3).forEach((gid, i) => {
    const g = content.goals.find((x) => x.id === gid);
    if (!g) return;
    for (const [sid, val] of Object.entries(g.skillWeights)) {
      const sk = skills.get(sid);
      if (!sk || !eligible(sk, profile.level)) continue;
      w.set(sid, (w.get(sid) ?? 0) + val * RANK[i]!);
    }
  });

  for (const m of profile.moves) {
    const mv = content.moves.find((x) => x.id === m.id);
    if (!mv) continue;
    chosen.add(mv.skillId);
    w.set(mv.skillId, (w.get(mv.skillId) ?? 0) + (m.mode === 'learn' ? LEARN_BONUS : IMPROVE_BONUS));
  }

  for (const [sid, val] of w) {
    const sk = skills.get(sid)!;
    w.set(sid, val * (sk.styleWeights[profile.style] ?? 1));
  }

  const out: FocusEntry[] = [];
  const added = new Map<string, string>();
  // Add missing prerequisites of every skill with real focus (above base)
  const focusIds = [...w.entries()].filter(([, v]) => v > BASE + 1e-9).map(([k]) => k);
  const addPrereqs = (sid: string, depth: number) => {
    const sk = skills.get(sid);
    if (!sk || depth > 6) return;
    for (const p of sk.prerequisites) {
      const ps = skills.get(p)!;
      if (prereqKnown(ps, profile.level, learnedSkills)) continue;
      const need = Math.max((w.get(sid) ?? 0) * 0.6, 1.5);
      if ((w.get(p) ?? 0) < need) {
        w.set(p, need);
        if (!added.has(p) && !chosen.has(p)) added.set(p, engineText.addedPrereq(ps.name, sk.name));
      }
      addPrereqs(p, depth + 1);
    }
  };
  for (const sid of focusIds) addPrereqs(sid, 0);

  for (const [sid, weight] of w) {
    const e: FocusEntry = { skillId: sid, weight: Math.round(weight * 1000) / 1000 };
    const because = added.get(sid);
    if (because) e.addedBecause = because;
    out.push(e);
  }
  out.sort((a, b) => b.weight - a.weight || a.skillId.localeCompare(b.skillId));
  return out;
}

/**
 * Order "learn" moves so prerequisites come first. Prerequisite skills that were
 * added (and have a move) are learned before the moves that need them.
 */
export function learnOrder(profile: Profile, content: Content, focus: FocusEntry[]): string[] {
  const skills = new Map(content.skills.map((s) => [s.id, s]));
  const moveOfSkill = (sid: string) => content.moves.find((m) => m.skillId === sid);
  const wanted: string[] = profile.moves.filter((m) => m.mode === 'learn').map((m) => m.id);
  // add moves for prerequisite skills that were added
  for (const f of focus) {
    if (!f.addedBecause) continue;
    const mv = moveOfSkill(f.skillId);
    if (mv && !wanted.includes(mv.id) && !profile.moves.some((m) => m.id === mv.id)) wanted.push(mv.id);
  }
  // Beginner stroke order first (FH drive → BH drive → BH push → FH push), then by level and id
  const BASE = ['ready-stance', 'fh-drive', 'bh-drive', 'bh-push', 'fh-push'];
  const rank = (id: string) => {
    const i = BASE.indexOf(id);
    const mv = content.moves.find((m) => m.id === id);
    return i >= 0 ? i : 100 + (mv?.levelMin ?? 5) * 10;
  };
  wanted.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const order: string[] = [];
  const visiting = new Set<string>();
  const visit = (mid: string) => {
    if (order.includes(mid) || visiting.has(mid)) return;
    visiting.add(mid);
    const mv = content.moves.find((m) => m.id === mid);
    if (mv) {
      for (const p of skills.get(mv.skillId)?.prerequisites ?? []) {
        const pm = moveOfSkill(p);
        if (pm && wanted.includes(pm.id)) visit(pm.id);
      }
    }
    order.push(mid);
  };
  for (const m of wanted) visit(m);
  return order;
}
