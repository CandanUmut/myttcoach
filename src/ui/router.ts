import { signal, computed } from '@preact/signals';

/* Hash routing: GitHub Pages has no fallback for client-side routes. */

function read() {
  const h = typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : '';
  return h || '/';
}

export const path = signal(read());

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    path.value = read();
    window.scrollTo(0, 0);
  });
}

export const segments = computed(() => path.value.split('?')[0]!.split('/').filter(Boolean));

export function navigate(to: string, replace = false) {
  const url = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (replace) {
    history.replaceState(null, '', url);
    path.value = read();
  } else {
    location.hash = url;
  }
}

export function back(fallback = '/today') {
  if (history.length > 1) history.back();
  else navigate(fallback);
}

export function match(pattern: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = segments.value;
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!;
    const b = s[i]!;
    if (a.startsWith(':')) params[a.slice(1)] = decodeURIComponent(b);
    else if (a !== b) return null;
  }
  return params;
}

export const query = computed(() => {
  const q = path.value.split('?')[1] ?? '';
  return Object.fromEntries(new URLSearchParams(q));
});
