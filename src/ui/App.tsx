import { path, match } from './router';
import { StyleBoard } from './screens/StyleBoard';
import { MoveScreen } from './screens/MoveScreen';
import { DrillScreen } from './screens/DrillScreen';
import { BallMoment } from '../design/motion';

export function App() {
  void path.value;
  let m: Record<string, string> | null;
  let screen;
  if ((m = match('/styleboard'))) screen = <StyleBoard />;
  else if ((m = match('/styleboard/:dir'))) screen = <StyleBoard only={m.dir} />;
  else if ((m = match('/learn/:moveId'))) screen = <MoveScreen moveId={m.moveId!} />;
  else if ((m = match('/library/drill/:id'))) screen = <DrillScreen drillId={m.id!} />;
  else screen = <StyleBoard />;
  return (
    <>
      {screen}
      <BallMoment />
    </>
  );
}
