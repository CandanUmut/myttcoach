import { useEffect } from 'preact/hooks';
import { match, path, query, navigate } from './router';
import { loaded, profile, program } from './state';
import { StyleBoard } from './screens/StyleBoard';
import { MoveScreen } from './screens/MoveScreen';
import { DrillScreen } from './screens/DrillScreen';
import { Welcome } from './screens/Welcome';
import { Onboarding } from './screens/Onboarding';
import { PlayerCard } from './screens/PlayerCard';
import { Today } from './screens/Today';
import { Plan, SessionDetail } from './screens/Plan';
import { SessionPlayer } from './screens/SessionPlayer';
import { Learn } from './screens/Learn';
import { Library } from './screens/Library';
import { Progress } from './screens/Progress';
import { Journal, JournalForm } from './screens/Journal';
import { ServeLab } from './screens/ServeLab';
import { SpinHelper } from './screens/SpinHelper';
import { Settings } from './screens/Settings';
import { BallMoment } from '../design/motion';
import { DevShot } from './screens/DevShot';
import { PoseEditor } from './screens/PoseEditor';
import { engineState } from './state';

function Routes() {
  void path.value;
  let m: Record<string, string> | null;
  // Always available
  if ((m = match('/styleboard'))) return <StyleBoard />;
  if ((m = match('/styleboard/:dir'))) return <StyleBoard only={m.dir} />;
  if (match('/dev/poses')) return <PoseEditor />;
  if ((m = match('/dev/shot/:id/:t/:cam'))) return <DevShot id={m.id!} t={Number(m.t)} cam={m.cam as never} />;
  if ((m = match('/onboarding/:step'))) return <Onboarding step={Number(m.step) || 1} edit={query.value.edit === '1' && !!profile.value} />;
  if ((m = match('/library/drill/:id'))) return <DrillScreen drillId={m.id!} />;
  if ((m = match('/learn/:moveId'))) {
    const st = (engineState.value.stageOf as Record<string, number>)[m.moveId!] ?? 0;
    return <MoveScreen key={m.moveId} moveId={m.moveId!} stageIndex={Math.min(6, st)} />;
  }
  if (!profile.value || !program.value) return <Welcome />;
  if (match('/') || match('/today')) return <Today />;
  if (match('/card')) return <PlayerCard />;
  if (match('/plan')) return <Plan />;
  if ((m = match('/plan/:id'))) return <SessionDetail id={m.id!} />;
  if ((m = match('/play/:id'))) return <SessionPlayer key={m.id} id={m.id!} />;
  if (match('/learn')) return <Learn />;
  if (match('/library')) return <Library />;
  if (match('/progress')) return <Progress />;
  if (match('/settings')) return <Settings />;
  if (match('/journal')) return <Journal />;
  if (match('/journal/new')) return <JournalForm id={null} />;
  if ((m = match('/journal/:id'))) return <JournalForm key={m.id} id={m.id!} />;
  if (match('/serve-lab')) return <ServeLab />;
  if (match('/spin')) return <SpinHelper />;
  return <Today />;
}

export function App() {
  useEffect(() => {
    if (loaded.value && profile.value && match('/')) navigate('/today', true);
  }, [loaded.value]);
  if (!loaded.value) return <div class="splash" aria-busy="true" />;
  return (
    <>
      <main>
        <Routes />
      </main>
      <BallMoment />
    </>
  );
}
