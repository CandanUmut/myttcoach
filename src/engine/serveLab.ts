/** Serve lab scoring. Landing points are in table units on the far half:
 *  x 0..1 left to right (server's view), y 0..1 from the net to the end line.
 *  Anything outside 0..1 missed the table. */
export type LandingZone = 'short' | 'half' | 'long' | 'out';
export type ServeTarget = 'short' | 'half' | 'long' | 'mixed';

export const ROUND = 10;

export function zoneOf(x: number, y: number): LandingZone {
  if (x < 0 || x > 1 || y < 0 || y > 1) return 'out';
  return y < 1 / 3 ? 'short' : y < 2 / 3 ? 'half' : 'long';
}

/** The zone to aim at for serve i (0-based). Mixed alternates short, long, short… */
export function targetFor(target: ServeTarget, i: number): 'short' | 'half' | 'long' {
  if (target === 'mixed') return i % 2 === 0 ? 'short' : 'long';
  return target;
}

export function hitsOf(entry: { target: ServeTarget; landings: { zone: LandingZone }[] }): number {
  return entry.landings.filter((l, i) => l.zone === targetFor(entry.target, i)).length;
}
