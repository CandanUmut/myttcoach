/* Joint names (same names as mannequin.js; our own code) and limits in degrees.
   Sign conventions (right-handed player, facing the table):
   - body/torso: bend + = lean forward, turn + = rotate to the player's right, tilt + = lean to the right
   - arm: raise + = lift forward/up, straddle + = out to the side, turn + = twist outward
   - elbow/knee: bend + = flex
   - wrist: bend + = flex toward palm, turn + = supinate (open the bat face), tilt + = bat head up
   - leg: raise + = lift forward, straddle + = out to the side, turn + = toes outward */

export const JOINT_LIMITS: Record<string, [number, number]> = {
  'body.bend': [-30, 70], 'body.turn': [-70, 70], 'body.tilt': [-30, 30],
  'torso.bend': [-30, 60], 'torso.turn': [-80, 80], 'torso.tilt': [-35, 35],
  'head.nod': [-40, 50], 'head.turn': [-80, 80], 'head.tilt': [-30, 30],
};
for (const s of ['r', 'l']) {
  Object.assign(JOINT_LIMITS, {
    [`${s}_arm.raise`]: [-70, 180], [`${s}_arm.straddle`]: [-60, 160], [`${s}_arm.turn`]: [-100, 100],
    [`${s}_elbow.bend`]: [0, 155],
    [`${s}_wrist.bend`]: [-75, 75], [`${s}_wrist.turn`]: [-100, 100], [`${s}_wrist.tilt`]: [-40, 50],
    [`${s}_leg.raise`]: [-45, 120], [`${s}_leg.straddle`]: [-25, 70], [`${s}_leg.turn`]: [-50, 70],
    [`${s}_knee.bend`]: [0, 145],
    [`${s}_ankle.bend`]: [-45, 55], [`${s}_ankle.turn`]: [-35, 35], [`${s}_ankle.tilt`]: [-35, 35],
  });
}

export const JOINT_NAMES = Object.keys(JOINT_LIMITS);

/** Joints that rotate on three axes (interpolated with quaternions). */
export const THREE_AXIS = ['body', 'torso', 'head', 'r_arm', 'l_arm', 'r_wrist', 'l_wrist', 'r_leg', 'l_leg', 'r_ankle', 'l_ankle'];

export function clampJoint(name: string, v: number): number {
  const l = JOINT_LIMITS[name];
  return l ? Math.max(l[0], Math.min(l[1], v)) : v;
}
