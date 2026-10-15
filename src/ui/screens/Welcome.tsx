import { Button } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { appName, welcome as W } from '../../strings/en';
import { startNew } from './Onboarding';
import { RestoreButton } from './Settings';

export function Welcome() {
  return (
    <div class="screen screen--bare welcome">
      <Backdrop variant="welcome" />
      <div class="welcome__ball" aria-hidden="true">
        <svg viewBox="0 0 320 200">
          <path d="M10 180 H310" class="welcome__table" />
          <path d="M160 180 V150" class="welcome__net" />
          <path d="M30 120 Q100 10 165 110 T250 178 Q275 140 300 178" class="welcome__path" />
          <circle cx="300" cy="170" r="9" class="welcome__dot" />
        </svg>
      </div>
      <div class="stack stack--l">
        <div class="stack">
          <p class="welcome__brand">{appName}</p>
          <h1>{W.title}</h1>
          <p class="welcome__body">{W.body}</p>
        </div>
        <div class="stack stack--s">
          <Button big wide onClick={startNew}>
            {W.start}
          </Button>
          <p class="muted center">{W.time}</p>
        </div>
        <RestoreButton kind="ghost" />
      </div>
    </div>
  );
}
