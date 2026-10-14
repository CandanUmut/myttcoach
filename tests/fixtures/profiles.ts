import type { Profile } from '../../src/engine/types';

export const beginnerNoTable: Profile = {
  name: 'Sam', hand: 'R', grip: 'shakehand', ageBand: '18-34', level: 1, style: 'balanced',
  goals: ['basics', 'fitness'], moves: [{ id: 'fh-drive', mode: 'learn' }, { id: 'bh-drive', mode: 'learn' }],
  workoutTypes: ['technique', 'fitness'], setups: ['shadow'],
  schedule: { days: [1, 3, 5], time: 'evening', length: 30, weeks: 4, startDate: '2026-10-19' },
  goalMetric: { metricId: 'bounce-streak', start: 8, target: 30, targetDate: '2026-11-15' },
  lowImpact: true, voice: 'calm', regenCount: 0,
};

export const intermediatePartner: Profile = {
  name: 'Umut', hand: 'R', grip: 'shakehand', ageBand: '35-49', level: 3, style: 'allRoundAttacker',
  goals: ['attack', 'serveReceive', 'footwork'], moves: [{ id: 'fh-loop-backspin', mode: 'learn' }, { id: 'bh-drive', mode: 'improve' }],
  workoutTypes: ['technique', 'serveReceive'], setups: ['partner', 'multiball'],
  schedule: { days: [2, 4, 6], time: 'evening', length: 60, weeks: 8, startDate: '2026-10-20' },
  goalMetric: { metricId: 'loop-backspin-10', start: 4, target: 8, targetDate: '2026-12-14' },
  lowImpact: false, voice: 'direct', regenCount: 0,
};

export const advancedRobot: Profile = {
  name: 'Lea', hand: 'L', grip: 'shakehand', ageBand: '18-34', level: 4, style: 'midLooper',
  goals: ['tournament', 'attack', 'fitness'], moves: [{ id: 'fh-loop-backspin', mode: 'improve' }],
  workoutTypes: ['footwork', 'fitness', 'matchPlay'], setups: ['robot'],
  schedule: { days: [1, 2, 4, 6], time: 'morning', length: 90, weeks: 6, startDate: '2026-10-19' },
  goalMetric: { metricId: 'two-point-60', start: 20, target: 35, targetDate: '2026-11-29' },
  lowImpact: false, voice: 'energetic', regenCount: 0,
};
