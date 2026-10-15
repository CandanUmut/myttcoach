import { useState } from 'preact/hooks';
import { content } from '../../content/load';
import { Button, Chip } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { Icon } from '../../design/icons';
import { common, journalText as T } from '../../strings/en';
import type { JournalEntry } from '../../storage/schema';
import { data, deleteJournal, saveJournal, today, type JournalPlan } from '../state';
import { back, navigate } from '../router';
import { Dialog, Field, Segmented, Toggle } from '../components/Controls';
import { shortDate } from '../sessionInfo';

const tagName = (id: string) => content.journal.tags.find((t) => t.id === id)?.name ?? id;
const oppName = (id: string) => content.journal.opponents.find((t) => t.id === id)?.name ?? id;

/** List of logged matches, newest first. */
export function Journal() {
  const list = [...data.value.journal].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return (
    <div class="screen screen--bare">
      <Backdrop variant="progress" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/progress')} />
      </div>
      <div class="stack stack--l">
        <div class="stack stack--s">
          <h1>{T.title}</h1>
          <p class="muted">{T.intro}</p>
        </div>
        <Button icon="plus" wide big href="#/journal/new">
          {T.logMatch}
        </Button>
        {list.length ? (
          <ul class="journal-list">
            {list.map((j) => (
              <li>
                <a class="journal-item" href={`#/journal/${j.id}`}>
                  <span class={`journal-item__result${j.won === true ? ' is-won' : j.won === false ? ' is-lost' : ''}`} aria-hidden="true">
                    {j.won === true ? T.wonShort : j.won === false ? T.lostShort : '–'}
                  </span>
                  <span class="journal-item__text">
                    <span class="journal-item__title">
                      {T.vs(oppName(j.opponentStyle))}
                      {j.lefty ? `, ${T.leftyShort}` : ''}
                      {j.score ? <span class="num"> · {j.score}</span> : null}
                    </span>
                    <span class="journal-item__sub">
                      {shortDate(j.date)}
                      <span class="sr-only">, {j.won === true ? T.won : j.won === false ? T.lost : T.noResult}</span>
                      {j.didnt.length ? ` · ${T.didntList(j.didnt.map(tagName).join(', '))}` : ''}
                    </span>
                  </span>
                  <Icon name="forward" size={20} />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted">{T.empty}</p>
        )}
      </div>
    </div>
  );
}

/** New or edit form. Saving re-plans the next sessions and says what changed. */
export function JournalForm({ id }: { id: string | null }) {
  const existing = id ? data.value.journal.find((j) => j.id === id) : undefined;
  const [e, setE] = useState<JournalEntry>(
    () =>
      existing ?? {
        id: `m${Date.now().toString(36)}`,
        date: today.value,
        opponentStyle: 'unknown',
        won: null,
        worked: [],
        didnt: [],
      },
  );
  const [saved, setSaved] = useState<JournalPlan | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (p: Partial<JournalEntry>) => setE((x) => ({ ...x, ...p }));
  const toggle = (key: 'worked' | 'didnt', tag: string) => {
    const other = key === 'worked' ? 'didnt' : 'worked';
    const on = e[key].includes(tag);
    // a tag can't be both: picking it on one side removes it from the other
    set({ [key]: on ? e[key].filter((t) => t !== tag) : [...e[key], tag], [other]: e[other].filter((t) => t !== tag) } as never);
  };

  if (id && !existing && !saved) {
    return (
      <div class="screen screen--bare">
        <p>{common.notFound}</p>
        <Button href="#/journal">{T.backToJournal}</Button>
      </div>
    );
  }

  if (saved) {
    return (
      <div class="screen screen--bare">
        <Backdrop variant="progress" />
        <div class="stack stack--l">
          <h1>{T.saved}</h1>
          <p class="note">{saved.sessions ? T.inPlan(saved.sessions, saved.drills) : T.noNewFocus}</p>
          <div class="stack">
            <Button wide href="#/plan">
              {T.seePlan}
            </Button>
            <Button kind="quiet" wide href="#/journal">
              {T.backToJournal}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="screen screen--bare">
      <Backdrop variant="progress" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/journal')} />
        <h1 class="topbar__title">{existing ? T.editMatch : T.logMatch}</h1>
        <span />
      </div>
      <form
        class="stack stack--l"
        onSubmit={(ev) => {
          ev.preventDefault();
          const clean: JournalEntry = { ...e, score: e.score?.trim() || undefined, note: e.note?.trim() || undefined };
          setSaved(saveJournal(clean));
        }}
      >
        <Field label={T.date}>
          <input type="date" class="input" value={e.date} max={today.value} required onInput={(ev) => set({ date: (ev.target as HTMLInputElement).value })} />
        </Field>

        <fieldset class="stack stack--s">
          <legend class="field__label">{T.opponent}</legend>
          <div class="row row--wrap">
            {content.journal.opponents.map((o) => (
              <Chip selected={e.opponentStyle === o.id} onClick={() => set({ opponentStyle: o.id })}>
                {o.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Toggle checked={!!e.lefty} onChange={(v) => set({ lefty: v })} label={T.lefty} />

        <Field label={T.result}>
          <Segmented
            label={T.result}
            value={e.won === true ? 'won' : e.won === false ? 'lost' : 'none'}
            onChange={(v) => set({ won: v === 'won' ? true : v === 'lost' ? false : null })}
            options={[
              { value: 'won', label: T.won },
              { value: 'lost', label: T.lost },
              { value: 'none', label: T.noResult },
            ]}
          />
        </Field>

        <Field label={T.score} hint={T.scoreHint}>
          <input type="text" class="input" value={e.score ?? ''} maxLength={60} onInput={(ev) => set({ score: (ev.target as HTMLInputElement).value })} />
        </Field>

        <fieldset class="stack stack--s">
          <legend class="field__label">{T.didnt}</legend>
          <span class="field__hint">{T.didntHint}</span>
          <div class="row row--wrap">
            {content.journal.tags.map((t) => (
              <Chip selected={e.didnt.includes(t.id)} onClick={() => toggle('didnt', t.id)}>
                {t.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset class="stack stack--s">
          <legend class="field__label">{T.worked}</legend>
          <div class="row row--wrap">
            {content.journal.tags.filter((t) => !t.problemOnly).map((t) => (
              <Chip selected={e.worked.includes(t.id)} onClick={() => toggle('worked', t.id)}>
                {t.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Field label={T.note}>
          <textarea class="input input--area" rows={3} maxLength={500} value={e.note ?? ''} onInput={(ev) => set({ note: (ev.target as HTMLTextAreaElement).value })} />
        </Field>

        <div class="stack">
          <Button type="submit" wide big icon="check">
            {T.save}
          </Button>
          {existing ? (
            <Button kind="ghost" wide onClick={() => setConfirmDel(true)}>
              {T.delete}
            </Button>
          ) : null}
        </div>
      </form>
      <Dialog
        open={confirmDel}
        title={T.delete}
        onClose={() => setConfirmDel(false)}
        actions={
          <>
            <Button kind="quiet" onClick={() => setConfirmDel(false)}>
              {T.cancel}
            </Button>
            <Button
              onClick={() => {
                deleteJournal(e.id);
                setConfirmDel(false);
                navigate('/journal', true);
              }}
            >
              {T.delete}
            </Button>
          </>
        }
      >
        <p>{T.deleteConfirm}</p>
      </Dialog>
    </div>
  );
}
