import { useState } from 'preact/hooks';
import { content } from '../../content/load';
import type { Phase, Setup } from '../../content/types';
import { Chip } from '../../design/components';
import { Icon } from '../../design/icons';
import { Backdrop } from '../../design/backgrounds';
import { libraryText as T, phaseNames, setupNames } from '../../strings/en';
import { profile } from '../state';
import { BottomNav } from '../components/BottomNav';
import { Segmented } from '../components/Controls';

type Tab = 'moves' | 'drills' | 'styles' | 'tips';
let saved: { tab: Tab; q: string; level: number | null; phase: Phase | null; setup: Setup | null } = { tab: 'moves', q: '', level: null, phase: null, setup: null };

const has = (text: string, q: string) => text.toLowerCase().includes(q.toLowerCase());

export function Library() {
  const [st, setSt] = useState(saved);
  const set = (patch: Partial<typeof saved>) => {
    saved = { ...st, ...patch };
    setSt(saved);
  };
  const p = profile.value;
  const q = st.q.trim();
  const lvlOk = (min: number, max: number) => st.level === null || (st.level >= min && st.level <= max);

  const moves = content.moves.filter((m) => lvlOk(m.levelMin, 5) && (!q || has(m.name + m.summary + m.whenToUse, q)));
  const drills = content.drills.filter(
    (d) =>
      lvlOk(d.levelMin, d.levelMax) &&
      (!st.phase || d.phase === st.phase) &&
      (!st.setup || d.variants.some((v) => v.setup === st.setup)) &&
      (!q || has(d.name + d.purpose + d.variants.map((v) => v.instructions).join(' '), q)),
  );
  const styles = content.styles.filter((s) => !q || has(s.name + s.summary + s.howTheyPlay, q));
  const tips = content.tips.filter((t) => lvlOk(t.levelMin, t.levelMax) && (!q || has(t.text, q)));
  const count = { moves: moves.length, drills: drills.length, styles: styles.length, tips: tips.length }[st.tab];

  return (
    <div class="screen">
      <Backdrop variant="library" />
      <div class="stack stack--l">
        <h1>{T.title}</h1>
        <label class="search">
          <Icon name="search" />
          <span class="sr-only">{T.search}</span>
          <input type="search" class="input" placeholder={T.searchPh} value={st.q} onInput={(e) => set({ q: (e.target as HTMLInputElement).value })} />
        </label>
        <Segmented label={T.title} value={st.tab} onChange={(tab) => set({ tab })} options={(['moves', 'drills', 'styles', 'tips'] as Tab[]).map((t) => ({ value: t, label: T.tabs[t] }))} />
        {st.tab !== 'styles' ? (
          <div class="filters">
            <div class="row row--wrap">
              <Chip selected={st.level === null} onClick={() => set({ level: null })}>
                {T.allLevels}
              </Chip>
              {[1, 2, 3, 4, 5].map((l) => (
                <Chip selected={st.level === l} onClick={() => set({ level: st.level === l ? null : l })}>
                  {T.level(l)}
                </Chip>
              ))}
            </div>
            {st.tab === 'drills' ? (
              <>
                <div class="row row--wrap">
                  {(Object.keys(phaseNames) as Phase[]).map((ph) => (
                    <Chip selected={st.phase === ph} onClick={() => set({ phase: st.phase === ph ? null : ph })}>
                      {phaseNames[ph]}
                    </Chip>
                  ))}
                </div>
                <div class="row row--wrap">
                  {(Object.keys(setupNames) as Setup[]).map((s) => (
                    <Chip selected={st.setup === s} onClick={() => set({ setup: st.setup === s ? null : s })}>
                      {setupNames[s]}
                    </Chip>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        <p class="muted" aria-live="polite">
          {T.count(count)}
        </p>
        {count === 0 ? <p>{T.empty}</p> : null}

        {st.tab === 'moves' ? (
          <div class="rows">
            {moves.map((m) => (
              <a class="rowlink" href={`#/learn/${m.id}`}>
                <span class="rowlink__icon">
                  <Icon name={m.wing === 'none' ? 'footwork' : 'learn'} />
                </span>
                <span class="rowlink__main">
                  <span class="rowlink__title">{m.name}</span>
                  <span class="rowlink__sub">{m.summary}</span>
                </span>
                <span class="tag">{T.level(m.levelMin)}</span>
              </a>
            ))}
          </div>
        ) : null}
        {st.tab === 'drills' ? (
          <div class="rows">
            {drills.map((d) => (
              <a class="rowlink" href={`#/library/drill/${d.id}`}>
                <span class="rowlink__icon">
                  <Icon name={d.phase === 'footwork' ? 'footwork' : d.phase === 'serve' ? 'serve' : d.phase === 'matchPlay' ? 'match' : 'session'} />
                </span>
                <span class="rowlink__main">
                  <span class="rowlink__title">{d.name}</span>
                  <span class="rowlink__sub">{d.purpose}</span>
                </span>
                <span class="tag">{phaseNames[d.phase]}</span>
              </a>
            ))}
          </div>
        ) : null}
        {st.tab === 'styles' ? (
          <div class="stack">
            {styles.map((s) => (
              <details class={`panel style${p?.style === s.id ? ' is-mine' : ''}`}>
                <summary>
                  <strong>{s.name}</strong>
                  <span class="muted">{s.summary}</span>
                </summary>
                <div class="stack stack--s">
                  <p>{s.howTheyPlay}</p>
                  <p>
                    <strong>{T.strengths}: </strong>
                    {s.strengths.join(', ')}.
                  </p>
                  <p>
                    <strong>{T.watchOuts}: </strong>
                    {s.watchOuts.join(', ')}.
                  </p>
                  <p>
                    <strong>{T.against}: </strong>
                    {s.playingAgainst}
                  </p>
                </div>
              </details>
            ))}
          </div>
        ) : null}
        {st.tab === 'tips' ? (
          <div class="stack">
            {tips.map((t) => (
              <p class="tipcard">{t.text}</p>
            ))}
          </div>
        ) : null}
      </div>
      <BottomNav active="library" />
    </div>
  );
}
