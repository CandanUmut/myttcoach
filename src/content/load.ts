import type { Content, Drill, Goal, JournalContent, Metric, SpinHelper, Move, Skill, Style, Templates, Tip } from './types';
import meta from '../../content/meta.json';
import skills from '../../content/skills.json';
import drills from '../../content/drills.json';
import metrics from '../../content/metrics.json';
import tips from '../../content/tips.json';
import styles from '../../content/styles.json';
import goals from '../../content/goals.json';
import templates from '../../content/templates.json';
import journal from '../../content/journal.json';
import spinHelper from '../../content/spin-helper.json';

const moveFiles = import.meta.glob('../../content/moves/*.json', { eager: true, import: 'default' }) as Record<string, Move>;
// Batch files: content/<kind>/*.json each hold an array, merged after the main file
const batch = <T,>(files: Record<string, T[]>): T[] => Object.keys(files).sort().flatMap((k) => files[k]!);
const skillBatches = batch(import.meta.glob('../../content/skills/*.json', { eager: true, import: 'default' }) as Record<string, Skill[]>);
const drillBatches = batch(import.meta.glob('../../content/drills/*.json', { eager: true, import: 'default' }) as Record<string, Drill[]>);
const tipBatches = batch(import.meta.glob('../../content/tips/*.json', { eager: true, import: 'default' }) as Record<string, Tip[]>);
const metricBatches = batch(import.meta.glob('../../content/metrics/*.json', { eager: true, import: 'default' }) as Record<string, Metric[]>);

export const content: Content = {
  version: meta.version,
  skills: [...(skills as unknown as Skill[]), ...skillBatches],
  moves: Object.keys(moveFiles)
    .sort()
    .map((k) => moveFiles[k]!),
  drills: [...(drills as unknown as Drill[]), ...drillBatches],
  metrics: [...(metrics as unknown as Metric[]), ...metricBatches],
  tips: [...(tips as unknown as Tip[]), ...tipBatches],
  styles: styles as unknown as Style[],
  goals: goals as unknown as Goal[],
  templates: templates as unknown as Templates,
  journal: journal as unknown as JournalContent,
  spinHelper: spinHelper as unknown as SpinHelper,
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
