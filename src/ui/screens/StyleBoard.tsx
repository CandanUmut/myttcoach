import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/fraunces/wght.css';
import '@fontsource-variable/lexend/wght.css';
import { useState } from 'preact/hooks';
import { styleboard as S } from '../../strings/en';
import { Icon, allIcons } from '../../design/icons';
import { Backdrop } from '../../design/backgrounds';
import { ArcProgress, BounceStepper, Button, Chip, PlyDivider, TableDiagram } from '../../design/components';
import { celebrate } from '../../design/motion';
import { BottomNavPreview } from '../components/BottomNav';

type Dir = 'blade' | 'rubber' | 'hall';
const dirs: Dir[] = ['blade', 'rubber', 'hall'];

const swatches: Record<Dir, [string, string][]> = {
  blade: [['Limba', '#fbf8f3'], ['Koto ply', '#ead7b4'], ['Walnut', '#9a6b3f'], ['Ball', '#f47a20'], ['Red rubber', '#c8262c'], ['Black rubber', '#1f1b18'], ['Table', '#1f4f6a']],
  rubber: [['Black rubber', '#171412'], ['Sheet', '#221d1a'], ['Walnut', '#b98a5c'], ['Ball', '#ff8a2a'], ['Red rubber', '#e2373d'], ['Table', '#2b6b8c']],
  hall: [['Hall light', '#f2f5f2'], ['Blade', '#d9c7a6'], ['Walnut', '#7a5a3a'], ['Ball', '#f07c22'], ['Red rubber', '#b8282e'], ['Table green', '#1e5b4e']],
};

const fonts: Record<Dir, string> = {
  blade: 'Bricolage Grotesque + Atkinson Hyperlegible Next',
  rubber: 'Big Shoulders Display + Atkinson Hyperlegible Next',
  hall: 'Fraunces + Lexend',
};

export function StyleBoard({ only }: { only?: string }) {
  const show = dirs.filter((d) => !only || d === only);
  return (
    <div class="styleboard">
      <header class="styleboard__head">
        <h1>{S.title}</h1>
        <p class="muted">{S.intro}</p>
      </header>
      <div class="styleboard__grid">
        {show.map((d) => (
          <Direction dir={d} />
        ))}
      </div>
    </div>
  );
}

function Direction({ dir }: { dir: Dir }) {
  const [sel, setSel] = useState(1);
  const info = S.directions[dir];
  return (
    <section class={`dir-${dir} styleboard__dir`} data-dir={dir}>
      <div class="styleboard__frame">
        <h2>{info.name}</h2>
        <p class="muted">{info.note}</p>

        <h3 class="styleboard__label">{S.palette}</h3>
        <div class="swatches">
          {swatches[dir].map(([n, c]) => (
            <div class="swatch">
              <span style={{ background: c }} />
              <small>{n}</small>
            </div>
          ))}
        </div>

        <h3 class="styleboard__label">{S.type}</h3>
        <p class="styleboard__display">Forehand loop</p>
        <p>{S.typeSample}</p>
        <p class="muted styleboard__small">{fonts[dir]}</p>

        <h3 class="styleboard__label">{S.icons}</h3>
        <div class="icon-grid">
          {allIcons.slice(0, 12).map((n) => (
            <div class="icon-grid__cell" title={n}>
              <Icon name={n} size={28} />
              <small>{n}</small>
            </div>
          ))}
        </div>

        <h3 class="styleboard__label">{S.controls}</h3>
        <div class="stack">
          <Button icon="play" wide onClick={() => celebrate('Drill done. 20 in a row.')}>Start session</Button>
          <div class="feel-row">
            <Button kind="quiet">Too easy</Button>
            <Button kind="strong">Right</Button>
            <Button kind="quiet">Too hard</Button>
          </div>
          <div class="row row--wrap">
            <Chip selected={sel === 0} onClick={() => setSel(0)} rank={sel === 0 ? 1 : undefined}>Footwork</Chip>
            <Chip selected={sel === 1} onClick={() => setSel(1)} rank={sel === 1 ? 1 : undefined}>Serve and receive</Chip>
            <Chip icon="spin">Attack</Chip>
          </div>
          <ArcProgress value={5} max={12} label="5 of 12 sessions this block" />
          <BounceStepper steps={['See', 'Shadow', 'Feel', 'Groove', 'Mix', 'Use', 'Own']} current={2} />
          <PlyDivider />
        </div>

        <h3 class="styleboard__label">{S.sample}</h3>
        <SampleToday />
      </div>
    </section>
  );
}

function SampleToday() {
  return (
    <div class="phone">
      <div class="screen screen--sample">
        <Backdrop variant="today" />
        <div class="topbar">
          <span class="topbar__title">Third Ball</span>
          <Button kind="ghost" icon="settings" label="Settings" />
        </div>
        <div class="stack stack--l">
          <div class="stack stack--s">
            <h1>Evening, Umut</h1>
            <p class="muted">Tuesday. Week 2 of your 8-week plan.</p>
          </div>
          <div class="hero">
            <span class="hero__eyebrow">Tonight's session</span>
            <h2>Forehand loop against backspin</h2>
            <div class="hero__meta">
              <span><Icon name="timer" size={18} />60 min</span>
              <span><Icon name="library" size={18} />Multiball</span>
            </div>
            <Button icon="play" wide big>Start</Button>
          </div>
          <div class="note">
            <span class="note__who">Coach note</span>
            <p>You hit 18 in a row last time. Today, aim for 20 before you move the target.</p>
          </div>
          <div class="panel">
            <div class="stack stack--s">
              <div class="row row--between">
                <strong>Forehand loop</strong>
                <span class="tag tag--accent">Feel it</span>
              </div>
              <BounceStepper steps={['See', 'Shadow', 'Feel', 'Groove', 'Mix', 'Use', 'Own']} current={2} />
            </div>
          </div>
          <div class="row">
            <TableDiagram placements={[{ zone: 'bh', depth: 'long', order: 1 }, { zone: 'fh', depth: 'long', order: 2 }]} />
            <p class="muted">Two-point drill. One to your backhand, one to your forehand. Recover to the middle each time.</p>
          </div>
        </div>
        <BottomNavPreview active="today" />
      </div>
    </div>
  );
}
