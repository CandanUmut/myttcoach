import { content } from '../../content/load';
import { milestones, type Milestone } from '../../engine/milestones';
import { hitsOf } from '../../engine/serveLab';
import { Icon } from '../../design/icons';
import { milestoneText as T } from '../../strings/en';
import type { AppData } from '../../storage/schema';
import { shortDate } from '../sessionInfo';

const LOOP_SKILLS = ['fh-loop-backspin', 'fh-loop-topspin', 'bh-topspin', 'counter-loop'];
const loopDrillIds = new Set(content.drills.filter((d) => d.skills.some((s) => LOOP_SKILLS.includes(s.id) && s.weight >= 0.6)).map((d) => d.id));

export function milestonesOf(d: AppData): Milestone[] {
  return milestones({
    profile: d.profile,
    program: d.program,
    logs: d.logs,
    results: d.results,
    stagePasses: d.stagePasses,
    journal: d.journal,
    serveLab: d.serveLab.map((r) => ({ date: r.date, hits: hitsOf(r) })),
    loopDrillIds,
  });
}

/** Quiet list: reached markers with their date, then the next one or two to aim for. */
export function Milestones({ data }: { data: AppData }) {
  const all = milestonesOf(data);
  const reached = all.filter((m) => m.date).sort((a, b) => b.date!.localeCompare(a.date!));
  // next: unreached count milestones that are furthest along
  const next = all
    .filter((m) => !m.date && m.need)
    .sort((a, b) => b.have! / b.need! - a.have! / a.need!)
    .slice(0, 2);
  return (
    <section class="stack">
      <h2 class="section-title">{T.title}</h2>
      <ul class="milestones">
        {reached.map((m) => (
          <li class="milestone is-reached">
            <Icon name="milestone" size={22} />
            <span class="milestone__text">
              <span class="milestone__name">{T.names[m.id]}</span>
              <span class="milestone__sub">{T.reached(shortDate(m.date!))}</span>
            </span>
          </li>
        ))}
        {next.map((m) => (
          <li class="milestone">
            <Icon name="milestone" size={22} />
            <span class="milestone__text">
              <span class="milestone__name">{T.names[m.id]}</span>
              <span class="milestone__sub">
                {m.need! > 1 ? (
                  <>
                    {T.next}: <span class="num">{m.id === 'loops-120' ? T.minutes(m.have!, m.need!) : T.progress(m.have!, m.need!)}</span>
                  </>
                ) : (
                  T.next
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
