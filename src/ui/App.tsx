import { path, segments } from './router';
import { StyleBoard } from './screens/StyleBoard';
import { BallMoment } from '../design/motion';

export function App() {
  const s = segments.value;
  void path.value;
  let screen;
  if (s[0] === 'styleboard') screen = <StyleBoard only={s[1]} />;
  else screen = <StyleBoard />;
  return (
    <>
      {screen}
      <BallMoment />
    </>
  );
}
