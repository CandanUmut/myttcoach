import { byId } from '../../content/load';
import { Button } from '../../design/components';
import { Backdrop } from '../../design/backgrounds';
import { common } from '../../strings/en';
import { DrillCard } from '../components/DrillCard';
import { back } from '../router';

export function DrillScreen({ drillId }: { drillId: string }) {
  const drill = byId.drill.get(drillId);
  return (
    <div class="screen">
      <Backdrop variant="library" />
      <div class="topbar">
        <Button kind="ghost" icon="back" label={common.back} onClick={() => back('/library')} />
      </div>
      {drill ? <DrillCard drill={drill} headingLevel={1} /> : <p>{common.notFound}</p>}
    </div>
  );
}
