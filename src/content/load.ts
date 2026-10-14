import type { Content, Drill, Goal, Metric, Move, Skill, Style, Templates, Tip } from './types';
import meta from '../../content/meta.json';
import skills from '../../content/skills.json';
import drills from '../../content/drills.json';
import metrics from '../../content/metrics.json';
import tips from '../../content/tips.json';
import styles from '../../content/styles.json';
import goals from '../../content/goals.json';
import templates from '../../content/templates.json';

const moveFiles = import.meta.glob('../../content/moves/*.json', { eager: true, import: 'default' }) as Record<string, Move>;

export const content: Content = {
  version: meta.version,
  skills: skills as unknown as Skill[],
  moves: Object.keys(moveFiles)
    .sort()
    .map((k) => moveFiles[k]!),
  drills: drills as unknown as Drill[],
  metrics: metrics as unknown as Metric[],
  tips: tips as unknown as Tip[],
  styles: styles as unknown as Style[],
  goals: goals as unknown as Goal[],
  templates: templates as unknown as Templates,
};

/* Fast lookups */
export function indexById<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]));
}

export const byId = {
  skill: indexById(content.skills),
  move: indexById(content.moves),
  drill: indexById(content.drills),
  metric: indexById(content.metrics),
  tip: indexById(content.tips),
  style: indexById(content.styles),
  goal: indexById(content.goals),
};
