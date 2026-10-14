import { Icon, type IconName } from '../../design/icons';
import { nav } from '../../strings/en';

const items: { key: keyof typeof nav; icon: IconName; href: string }[] = [
  { key: 'today', icon: 'today', href: '#/today' },
  { key: 'plan', icon: 'plan', href: '#/plan' },
  { key: 'learn', icon: 'learn', href: '#/learn' },
  { key: 'library', icon: 'library', href: '#/library' },
  { key: 'progress', icon: 'progress', href: '#/progress' },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav class="bottomnav" aria-label="Main">
      <ul>
        {items.map((it) => (
          <li>
            <a href={it.href} aria-current={active === it.key ? 'page' : undefined}>
              <Icon name={it.icon} size={26} />
              <span>{nav[it.key]}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* Static copy for the style board sample (not fixed to the viewport). */
export function BottomNavPreview({ active }: { active: string }) {
  return (
    <div class="bottomnav bottomnav--preview">
      <ul>
        {items.map((it) => (
          <li>
            <a aria-current={active === it.key ? 'page' : undefined}>
              <Icon name={it.icon} size={26} />
              <span>{nav[it.key]}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
