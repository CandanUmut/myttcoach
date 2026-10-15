import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';
import { Icon, type IconName } from '../../design/icons';
import { Button } from '../../design/components';
import { controlsText } from '../../strings/en';

/** A big tappable row: radio (single) or checkbox (multi). */
export function OptionRow({
  title,
  sub,
  selected,
  onClick,
  multi,
  icon,
  badge,
}: {
  title: ComponentChildren;
  sub?: ComponentChildren;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
  icon?: IconName;
  badge?: ComponentChildren;
}) {
  return (
    <button type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={selected} class={`option${selected ? ' is-on' : ''}`} onClick={onClick}>
      {icon ? (
        <span class="option__icon">
          <Icon name={icon} size={26} />
        </span>
      ) : null}
      <span class="option__text">
        <span class="option__title">{title}</span>
        {sub ? <span class="option__sub">{sub}</span> : null}
      </span>
      {badge ? <span class="option__badge">{badge}</span> : <span class={`option__mark${multi ? ' option__mark--box' : ''}`} aria-hidden="true" />}
    </button>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ComponentChildren }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={o.value === value} class={`seg${o.value === value ? ' is-on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  unit,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
}) {
  return (
    <div class="stepper" role="group" aria-label={label}>
      <Button kind="quiet" icon="minus" label={controlsText.less(label)} onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} />
      <div class="stepper__value">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          aria-label={label}
          onInput={(e) => {
            const n = Number((e.target as HTMLInputElement).value);
            if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
        />
        {unit ? <span class="stepper__unit">{unit}</span> : null}
      </div>
      <Button kind="quiet" icon="plus" label={controlsText.more(label)} onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} />
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} class="toggle" onClick={() => onChange(!checked)}>
      <span class="toggle__text">
        <span class="option__title">{label}</span>
        {sub ? <span class="option__sub">{sub}</span> : null}
      </span>
      <span class={`toggle__track${checked ? ' is-on' : ''}`} aria-hidden="true">
        <span class="toggle__ball" />
      </span>
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ComponentChildren; hint?: string }) {
  return (
    <div class="field">
      <span class="field__label">{label}</span>
      {children}
      {hint ? <span class="field__hint">{hint}</span> : null}
    </div>
  );
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  actions,
}: {
  open: boolean;
  title: string;
  children?: ComponentChildren;
  onClose: () => void;
  actions: ComponentChildren;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const tid = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} class="dialog" onClose={onClose} onCancel={onClose} aria-labelledby={tid}>
      <div class="dialog__body">
        <h2 id={tid} class="section-title">{title}</h2>
        {children}
        <div class="dialog__actions">{actions}</div>
      </div>
    </dialog>
  );
}

/** Sticky bottom action bar. */
export function ActionBar({ children }: { children: ComponentChildren }) {
  return <div class="actionbar">{children}</div>;
}
