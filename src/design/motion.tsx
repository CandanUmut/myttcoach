/*
  The one signature motion: a ball flies over the net and bounces twice.
  Used only for moments that matter (drill done, stage passed, goal hit).
  With "reduce motion" it becomes a still check mark.
*/
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Icon } from './icons';

const FLIGHT = 'M20 70 Q90 -10 160 60 T235 118 Q262 78 290 118';
const motionAttrs = { dur: '1.1s', fill: 'freeze', keyPoints: '0;1', keyTimes: '0;1', calcMode: 'spline', keySplines: '0.3 0.1 0.4 1', path: FLIGHT };

const moment = signal<{ id: number; text: string } | null>(null);
let counter = 0;

export function celebrate(text: string) {
  counter += 1;
  moment.value = { id: counter, text };
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function BallMoment() {
  const m = moment.value;
  useEffect(() => {
    if (!m) return;
    const t = setTimeout(() => {
      if (moment.value?.id === m.id) moment.value = null;
    }, 1900);
    return () => clearTimeout(t);
  }, [m?.id]);
  if (!m) return null;
  return (
    <div class="ball-moment" role="status" aria-live="polite" key={m.id}>
      <svg class="ball-moment__svg" viewBox="0 0 320 140" aria-hidden="true">
        <path d="M10 120 H310" class="ball-moment__table" />
        <path d="M160 120 V96" class="ball-moment__net" />
        <path d={FLIGHT} class="ball-moment__path" />
        <circle r="9" class="ball-moment__ball">
          <animateMotion {...(motionAttrs as any)} />
        </circle>
      </svg>
      <p class="ball-moment__text">
        <Icon name="check" size={22} />
        <span>{m.text}</span>
      </p>
    </div>
  );
}
