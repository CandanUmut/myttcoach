import { useRef, useState } from 'preact/hooks';
import { content } from '../../content/load';
import { Icon } from '../../design/icons';
import { Button, PlyDivider } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { common, settingsText as T } from '../../strings/en';
import { fromBackup, toBackup } from '../../storage/backup';
import { data, profile, replaceAll, resetAll, setSettings, updateProfile } from '../state';
import { Dialog, Segmented, Toggle } from '../components/Controls';
import { back, navigate } from '../router';
import { startEdit } from './Onboarding';
import { celebrate } from '../../design/motion';

export function RestoreButton({ kind = 'quiet' }: { kind?: 'quiet' | 'ghost' }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<ReturnType<typeof fromBackup> | null>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        class="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (!f) return;
          try {
            setPending(fromBackup(await f.text()));
            setError('');
          } catch (err) {
            setError((err as Error).message);
          }
          (e.target as HTMLInputElement).value = '';
        }}
      />
      <Button kind={kind} icon="upload" wide onClick={() => input.current?.click()}>
        {T.import}
      </Button>
      {error ? (
        <p class="error" role="alert">
          {error}
        </p>
      ) : null}
      <Dialog
        open={!!pending}
        title={T.import}
        onClose={() => setPending(null)}
        actions={
          <>
            <Button kind="quiet" onClick={() => setPending(null)}>
              {T.cancel}
            </Button>
            <Button
              onClick={() => {
                if (pending) replaceAll(pending);
                setPending(null);
                celebrate(T.imported);
                navigate(pending?.profile ? '/today' : '/', true);
              }}
            >
              {T.import}
            </Button>
          </>
        }
      >
        <p>{T.importConfirm}</p>
      </Dialog>
    </>
  );
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Settings() {
  const d = data.value;
  const s = d.settings;
  const [erase, setErase] = useState(false);
  const [regen, setRegen] = useState(false);
  return (
    <div class="screen screen--bare">
      <Backdrop variant="settings" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/today')} />
      </div>
      <div class="stack stack--l">
        <h1>{T.title}</h1>

        <section class="stack">
          <h2 class="section-title">{T.profile}</h2>
          <Button kind="quiet" icon="edit" wide onClick={startEdit}>
            {T.editProfile}
          </Button>
          <Button kind="quiet" icon="repeat" wide onClick={() => setRegen(true)}>
            {T.newPlan}
          </Button>
          <Button kind="ghost" wide href="#/card">
            {T.card}
          </Button>
        </section>
        <PlyDivider />

        <section class="stack">
          <h2 class="section-title">{T.look}</h2>
          <Segmented label={T.theme} value={s.theme} onChange={(theme) => setSettings({ theme })} options={(['auto', 'light', 'dark'] as const).map((t) => ({ value: t, label: T.themes[t] }))} />
          <Toggle label={T.sound} checked={s.sound} onChange={(sound) => setSettings({ sound })} />
          <Toggle label={T.readCues} sub={T.readCuesSub} checked={s.readCues} onChange={(readCues) => setSettings({ readCues })} />
        </section>
        <PlyDivider />

        <section class="stack">
          <h2 class="section-title">{T.data}</h2>
          <p class="muted">{T.dataNote}</p>
          <Button kind="quiet" icon="download" wide onClick={() => download(`third-ball-backup-${new Date().toISOString().slice(0, 10)}.json`, toBackup(d, new Date().toISOString()))}>
            {T.export}
          </Button>
          <RestoreButton />
          <Button kind="danger" wide onClick={() => setErase(true)}>
            {T.reset}
          </Button>
        </section>
        <PlyDivider />

        <section class="stack stack--s">
          <h2 class="section-title">{T.about}</h2>
          <p class="muted">{T.aboutBody}</p>
          <p class="muted small">{T.version(content.version)}</p>
          <a class="rowlink" href="https://candanumut.github.io/showcase/" rel="noopener">
            <span class="rowlink__main">
              <span class="rowlink__title">{T.moreApps}</span>
              <span class="rowlink__sub">{T.moreAppsSub}</span>
            </span>
            <Icon name="forward" size={20} />
          </a>
          <a class="muted small" href="#/styleboard">
            {T.styleboard}
          </a>
        </section>
      </div>

      <Dialog
        open={erase}
        title={T.reset}
        onClose={() => setErase(false)}
        actions={
          <>
            <Button kind="quiet" onClick={() => setErase(false)}>
              {T.cancel}
            </Button>
            <Button
              kind="strong"
              onClick={async () => {
                await resetAll();
                setErase(false);
                navigate('/', true);
              }}
            >
              {T.erase}
            </Button>
          </>
        }
      >
        <p>{T.resetConfirm}</p>
      </Dialog>
      <Dialog
        open={regen}
        title={T.newPlan}
        onClose={() => setRegen(false)}
        actions={
          <>
            <Button kind="quiet" onClick={() => setRegen(false)}>
              {T.cancel}
            </Button>
            <Button
              onClick={() => {
                const p = profile.value!;
                updateProfile({ ...p, regenCount: p.regenCount + 1 }, true);
                setRegen(false);
                navigate('/plan', true);
              }}
            >
              {T.regenYes}
            </Button>
          </>
        }
      >
        <p>{T.newPlanBody}</p>
      </Dialog>
    </div>
  );
}
