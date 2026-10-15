import { MoveViewer } from '../components/MoveViewer';
import type { CameraPreset } from '../../three/viewer';

/** Dev only: one frame of an animation, paused, for review screenshots. */
export function DevShot({ id, t, cam }: { id: string; t: number; cam: CameraPreset }) {
  return (
    <div class="devshot">
      <MoveViewer key={`${id}-${t}-${cam}`} animationId={id} startT={t} startCam={cam} paused bare />
    </div>
  );
}
