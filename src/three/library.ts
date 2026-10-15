import type { MoveAnimation } from './animation';

const files = import.meta.glob('../../content/animations/*.json', { import: 'default' }) as Record<string, () => Promise<MoveAnimation>>;

export const animationIds = Object.keys(files).map((k) => k.split('/').pop()!.replace('.json', ''));

export async function loadAnimation(id: string): Promise<MoveAnimation | null> {
  const key = Object.keys(files).find((k) => k.endsWith(`/${id}.json`));
  return key ? files[key]!() : null;
}
