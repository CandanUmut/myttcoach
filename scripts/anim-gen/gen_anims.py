"""Generate 21 of the move animations from shared base poses.
Writes content/animations/<id>.json. Re-run after changing numbers:  python3 scripts/anim-gen/gen_anims.py
(ready-stance, fh-drive, bh-drive and bh-push are hand-tuned files and are not generated here.)"""
import json, copy, os

# Arm angles found by scripts/solve-pose.ts: {id: {t: {joint: value}}}
SOLVED_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'solved.json')
SOLVED = json.load(open(SOLVED_PATH)) if os.path.exists(SOLVED_PATH) else {}


def apply_solved(id, keys):
    for kk in keys:
        o = SOLVED.get(id, {}).get(str(kk['t']))
        if o: kk['joints'].update(o)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'content', 'animations')

# Shared legs / body for a forehand-ready stance (right-hander)
FH_READY = {
    "body.bend": 8, "body.turn": 5, "torso.bend": 16, "torso.turn": 10, "head.nod": -12, "head.turn": -8,
    "r_leg.raise": 26, "l_leg.raise": 42, "r_leg.straddle": 13, "l_leg.straddle": 11, "r_leg.turn": 12, "l_leg.turn": 5,
    "r_knee.bend": 50, "l_knee.bend": 46, "r_ankle.bend": 32, "l_ankle.bend": 12,
    "r_arm.raise": 35, "r_arm.straddle": 12, "r_arm.turn": -40, "r_elbow.bend": 85, "r_wrist.turn": 0, "r_wrist.tilt": 25, "r_wrist.bend": 0,
    "l_arm.raise": 40, "l_arm.straddle": 15, "l_arm.turn": -25, "l_elbow.bend": 90,
}
BH_READY = {
    "body.bend": 8, "body.turn": 0, "torso.bend": 18, "torso.turn": 0, "head.nod": -14,
    "r_leg.raise": 34, "l_leg.raise": 36, "r_leg.straddle": 13, "l_leg.straddle": 13, "r_leg.turn": 8, "l_leg.turn": 8,
    "r_knee.bend": 50, "l_knee.bend": 50, "r_ankle.bend": 24, "l_ankle.bend": 22,
    "r_arm.raise": 42, "r_arm.straddle": 18, "r_arm.turn": -70, "r_elbow.bend": 100, "r_wrist.bend": 5, "r_wrist.turn": 0, "r_wrist.tilt": 38,
    "l_arm.raise": 30, "l_arm.straddle": 20, "l_arm.turn": -20, "l_elbow.bend": 85,
}
# step in toward a short ball with the right foot (checked by the push critic)
STEP_IN = {"r_leg.raise": 45, "r_knee.bend": 55, "r_ankle.bend": 18, "l_leg.raise": 15, "l_knee.bend": 56, "l_ankle.bend": 30}
DEEP = {"r_knee.bend": 68, "l_knee.bend": 52, "r_ankle.bend": 40, "l_ankle.bend": 14, "torso.bend": 26}


def legs_ankle(j):
    """Keep feet flat: ankle = body.bend - leg.raise + knee.bend (per side)."""
    bb = j.get("body.bend", 0)
    for s in ("r", "l"):
        if f"{s}_leg.raise" in j or f"{s}_knee.bend" in j:
            j[f"{s}_ankle.bend"] = max(-40, min(50, bb - j[f"{s}_leg.raise"] + j[f"{s}_knee.bend"]))
    return j


def anim(id, duration, phases, keys, ball=None, cues=None, camera=None, footwork=False):
    a = {"id": id, "duration": duration, "loop": True, "phases": [{"name": n, "t": t} for n, t in phases], "keys": keys}
    if ball: a["ball"] = ball
    if cues: a["cues"] = [{"t": t, "text": x} for t, x in cues]
    if camera: a["camera"] = camera
    if footwork: a["footwork"] = True
    return a


def k(t, joints, root=None):
    d = {"t": t, "joints": joints}
    if root is not None: d["root"] = root
    return d


def full(base, **over):
    j = copy.deepcopy(base)
    for kk, v in over.items():
        j[kk.replace("__", ".")] = v
    return j


def stroke(id, base, root0, back, contact, follow, *, dur, phases=None, ball=None, cues=None, camera=None, root_back=None, root_contact=None):
    ph = phases or [("Ready", 0), ("Backswing", 0.35), ("Contact", 0.6), ("Follow-through", 0.78), ("Recover", 0.9)]
    tb, tc, tf = ph[1][1], ph[2][1], ph[3][1]
    keys = [k(0, legs_ankle(copy.deepcopy(base)), root0)]
    keys.append(k(tb, legs_ankle({**base, **back}), root_back))
    keys.append(k(tc, legs_ankle({**base, **back, **contact}), root_contact))
    keys.append(k(tf, legs_ankle({**base, **back, **contact, **follow})))
    keys.append(k(1, legs_ankle(copy.deepcopy(base)), root0))
    apply_solved(id, keys)
    # keep only changed values after the first key (smaller files, same result)
    first = keys[0]["joints"]
    prev = dict(first)
    for kk in keys[1:]:
        ch = {n: v for n, v in kk["joints"].items() if prev.get(n) != v}
        prev.update(kk["joints"])
        kk["joints"] = ch
    return anim(id, dur, ph, keys, ball, cues, camera)


A = {}
FH_BALL = lambda spin, to=(0.5, 0.786, 1.0), frm=(0.45, 1.0, 1.25), bounce=(-0.2, 0.786, -0.75): {"contactT": 0.6, "spin": spin, "from": list(frm), "bounce": list(bounce), "to": list(to)}
BH_BALL = lambda spin, ct=0.58, to=(-0.5, 0.786, 1.0), frm=(-0.45, 1.0, 1.25), bounce=(0.3, 0.786, -0.7): {"contactT": ct, "spin": spin, "from": list(frm), "bounce": list(bounce), "to": list(to)}

# ---------- Forehand family ----------
A["fh-push"] = stroke("fh-push", FH_READY, {"x": 0, "z": 0, "turn": 0},
    back={**STEP_IN, "torso.bend": 26, "torso.turn": 18, "r_arm.raise": 18, "r_arm.straddle": 8, "r_arm.turn": 45, "r_elbow.bend": 95, "r_wrist.turn": 40, "r_wrist.tilt": 20, "r_wrist.bend": -10},
    contact={"torso.turn": 8, "r_arm.raise": 26, "r_arm.turn": 42, "r_elbow.bend": 80, "r_wrist.turn": 45},
    follow={"torso.turn": 0, "r_arm.raise": 32, "r_arm.turn": 38, "r_elbow.bend": 68},
    dur=1.5, phases=[("Ready", 0), ("Step in, backswing", 0.38), ("Contact", 0.56), ("Follow-through", 0.7), ("Recover", 0.9)],
    root_back={"z": 0.3}, ball={"contactT": 0.56, "spin": "backspin", "from": [0.35, 0.95, 1.2], "bounce": [-0.25, 0.786, -0.45], "to": [0.35, 0.786, 0.85]},
    cues=[(0, "Ready"), (0.32, "Step in with your foot"), (0.53, "Open face, under the ball"), (0.68, "Short finish"), (0.88, "Push off back to ready")])

A["fh-loop-backspin"] = stroke("fh-loop-backspin", FH_READY, {"x": 0, "z": -0.25, "turn": 0},
    back={**DEEP, "body.turn": 15, "torso.turn": 45, "torso.tilt": 8, "head.turn": -35, "r_arm.raise": -12, "r_arm.straddle": 10, "r_arm.turn": 30, "r_elbow.bend": 35, "r_wrist.turn": -5, "r_wrist.tilt": 20, "r_wrist.bend": -10,
          "l_arm.raise": 60, "l_arm.straddle": 10},
    contact={"body.turn": 3, "torso.turn": 8, "torso.tilt": 0, "head.turn": 0, "r_knee.bend": 50, "l_knee.bend": 50, "torso.bend": 18, "r_arm.raise": 18, "r_arm.straddle": 8, "r_arm.turn": 42, "r_elbow.bend": 60, "r_wrist.turn": -10, "r_wrist.tilt": 30},
    follow={"body.turn": -12, "torso.turn": -35, "head.turn": 20, "r_knee.bend": 34, "l_knee.bend": 46, "r_arm.raise": 115, "r_arm.straddle": 20, "r_arm.turn": 25, "r_elbow.bend": 105, "l_arm.raise": 30, "l_arm.straddle": 30},
    dur=1.5, ball=FH_BALL("topspin", frm=(0.45, 0.95, 1.25), bounce=(-0.3, 0.786, -0.8)),
    cues=[(0, "Ready, knees bent"), (0.3, "Drop the bat under the ball"), (0.56, "Legs first, brush up"), (0.74, "Finish high"), (0.9, "Back to ready")])

A["fh-block"] = stroke("fh-block", FH_READY, {"x": 0, "z": 0.18, "turn": 0},
    back={"torso.turn": 16, "r_arm.raise": 28, "r_arm.straddle": 10, "r_arm.turn": 40, "r_elbow.bend": 88, "r_wrist.turn": -20, "r_wrist.tilt": 30},
    contact={"torso.turn": 10, "r_arm.raise": 32, "r_arm.turn": 42, "r_elbow.bend": 82, "r_wrist.turn": -24},
    follow={"r_arm.raise": 34, "r_elbow.bend": 78},
    dur=0.95, ball=FH_BALL("topspin", frm=(0.45, 1.05, 1.25)),
    cues=[(0, "Bat in front"), (0.3, "No backswing"), (0.56, "Meet it on the rise"), (0.74, "Close the face over the ball"), (0.9, "Reset")])

A["fh-loop-topspin"] = stroke("fh-loop-topspin", FH_READY, {"x": 0, "z": -0.3, "turn": 0},
    back={"body.turn": 15, "torso.turn": 45, "head.turn": -35, "r_knee.bend": 60, "l_knee.bend": 44, "r_arm.raise": 2, "r_arm.straddle": 8, "r_arm.turn": 30, "r_elbow.bend": 60, "r_wrist.turn": -15, "r_wrist.tilt": 22, "r_wrist.bend": -10},
    contact={"body.turn": 2, "torso.turn": 4, "head.turn": 0, "r_knee.bend": 48, "l_knee.bend": 50, "r_arm.raise": 22, "r_arm.straddle": 6, "r_arm.turn": 45, "r_elbow.bend": 70, "r_wrist.turn": -22, "r_wrist.tilt": 32},
    follow={"body.turn": -12, "torso.turn": -34, "head.turn": 20, "r_arm.raise": 80, "r_arm.straddle": 16, "r_arm.turn": 32, "r_elbow.bend": 112},
    dur=1.3, ball=FH_BALL("topspin", frm=(0.45, 1.05, 1.25)),
    cues=[(0, "Ready"), (0.3, "Turn back"), (0.56, "Close the bat over the ball"), (0.74, "Swing forward, not up"), (0.9, "Recover")])

A["counter-loop"] = stroke("counter-loop", FH_READY, {"x": 0, "z": -0.9, "turn": 0},
    back={**DEEP, "body.turn": 20, "torso.turn": 55, "torso.tilt": 8, "head.turn": -40, "r_arm.raise": -5, "r_arm.straddle": 12, "r_arm.turn": 32, "r_elbow.bend": 45, "r_wrist.turn": -15, "r_wrist.tilt": 20, "l_arm.raise": 65, "l_arm.straddle": 15},
    contact={"body.turn": 2, "torso.turn": 5, "torso.tilt": 0, "head.turn": 0, "r_knee.bend": 50, "l_knee.bend": 52, "torso.bend": 18, "r_arm.raise": 20, "r_arm.straddle": 8, "r_arm.turn": 45, "r_elbow.bend": 65, "r_wrist.turn": -24, "r_wrist.tilt": 30},
    follow={"body.turn": -15, "torso.turn": -40, "head.turn": 25, "r_knee.bend": 38, "r_arm.raise": 100, "r_arm.straddle": 18, "r_arm.turn": 28, "r_elbow.bend": 110, "l_arm.raise": 25, "l_arm.straddle": 35},
    dur=1.6, ball=FH_BALL("topspin", frm=(0.45, 1.15, 1.25), bounce=(-0.25, 0.786, -1.0)),
    cues=[(0, "Give yourself room"), (0.3, "Big turn back"), (0.56, "Over the top of the ball"), (0.74, "Legs and hips first"), (0.9, "Step back in")])

A["fh-flick"] = stroke("fh-flick", FH_READY, {"x": 0, "z": 0, "turn": 0},
    back={**STEP_IN, "torso.bend": 28, "torso.turn": 12, "r_arm.raise": 24, "r_arm.straddle": 8, "r_arm.turn": 45, "r_elbow.bend": 92, "r_wrist.turn": 15, "r_wrist.tilt": 25, "r_wrist.bend": 20},
    contact={"r_arm.raise": 30, "r_elbow.bend": 85, "r_wrist.turn": 8, "r_wrist.bend": 0, "r_wrist.tilt": 32},
    follow={"torso.turn": 0, "r_arm.raise": 42, "r_elbow.bend": 98, "r_wrist.bend": -25, "r_wrist.tilt": 36},
    dur=1.4, phases=[("Ready", 0), ("Step in, small backswing", 0.38), ("Contact", 0.56), ("Follow-through", 0.7), ("Recover", 0.9)],
    root_back={"z": 0.3}, ball={"contactT": 0.56, "spin": "topspin", "from": [0.35, 0.95, 1.2], "bounce": [-0.25, 0.786, -0.4], "to": [0.45, 0.786, 1.0]},
    cues=[(0, "Ready"), (0.32, "Foot in first"), (0.53, "Bat close to the ball"), (0.68, "Up and forward, short"), (0.88, "Step back out")])

A["short-touch"] = stroke("short-touch", FH_READY, {"x": 0, "z": 0, "turn": 0},
    back={**STEP_IN, "torso.bend": 28, "torso.turn": 14, "r_arm.raise": 24, "r_arm.straddle": 8, "r_arm.turn": 44, "r_elbow.bend": 88, "r_wrist.turn": 45, "r_wrist.tilt": 22, "r_wrist.bend": -5},
    contact={"r_arm.raise": 26, "r_elbow.bend": 84, "r_wrist.turn": 50},
    follow={"r_arm.raise": 27, "r_elbow.bend": 82},
    dur=1.4, phases=[("Ready", 0), ("Step in", 0.38), ("Contact", 0.52), ("Tiny touch", 0.66), ("Recover", 0.9)],
    root_back={"z": 0.3}, ball={"contactT": 0.52, "spin": "backspin", "from": [0.3, 0.95, 1.2], "bounce": [-0.2, 0.786, -0.35], "to": [0.2, 0.786, 0.35]},
    cues=[(0, "Ready"), (0.32, "Step in close"), (0.5, "Early, just after the bounce"), (0.64, "Soft hands"), (0.88, "Step back out")])

A["smash"] = stroke("smash", FH_READY, {"x": 0, "z": -0.2, "turn": 0},
    back={"body.turn": 20, "torso.turn": 50, "torso.bend": 8, "head.nod": -20, "head.turn": -40, "r_knee.bend": 40, "l_knee.bend": 34, "r_arm.raise": 70, "r_arm.straddle": 45, "r_arm.turn": 55, "r_elbow.bend": 100, "r_wrist.turn": 0, "r_wrist.tilt": 30, "l_arm.raise": 100, "l_arm.straddle": 20},
    contact={"body.turn": 0, "torso.turn": 2, "head.turn": 0, "r_arm.raise": 75, "r_arm.straddle": 20, "r_arm.turn": 55, "r_elbow.bend": 70, "r_wrist.turn": -12, "l_arm.raise": 40},
    follow={"body.turn": -15, "torso.turn": -45, "torso.bend": 20, "r_knee.bend": 46, "l_knee.bend": 50, "r_arm.raise": 35, "r_arm.straddle": 0, "r_arm.turn": 10, "r_elbow.bend": 100, "l_arm.raise": 20, "l_arm.straddle": 30},
    dur=1.3, ball={"contactT": 0.6, "spin": "none", "from": [0.4, 1.6, 1.2], "bounce": [-0.2, 0.786, -0.6], "to": [0.55, 0.786, 0.9]},
    cues=[(0, "Ready"), (0.3, "Move under the ball, turn"), (0.56, "Top of the bounce"), (0.74, "Flat and through"), (0.9, "Ready for the lob")])

A["lob"] = stroke("lob", FH_READY, {"x": 0, "z": -1.9, "turn": 0},
    back={**DEEP, "body.turn": 15, "torso.turn": 40, "r_knee.bend": 78, "l_knee.bend": 60, "torso.bend": 30, "r_arm.raise": -18, "r_arm.straddle": 12, "r_arm.turn": 25, "r_elbow.bend": 30, "r_wrist.turn": -5, "r_wrist.tilt": 18, "r_leg.raise": 32, "r_knee.bend": 70},
    contact={"body.turn": 5, "torso.turn": 12, "r_knee.bend": 62, "l_knee.bend": 55, "r_arm.raise": 0, "r_arm.straddle": 8, "r_arm.turn": 40, "r_elbow.bend": 40, "r_wrist.turn": -12, "r_wrist.tilt": 30},
    follow={"body.turn": -5, "torso.turn": -20, "torso.bend": 10, "r_knee.bend": 35, "l_knee.bend": 38, "r_arm.raise": 145, "r_arm.straddle": 20, "r_arm.turn": 20, "r_elbow.bend": 70},
    dur=1.6, ball={"contactT": 0.6, "spin": "topspin", "from": [0.4, 1.0, 1.0], "bounce": [-0.2, 0.786, -0.9], "to": [0.3, 0.786, 1.2]},
    cues=[(0, "Far back"), (0.3, "Low to high"), (0.56, "Brush up for topspin"), (0.74, "Aim deep"), (0.9, "Stay back")])

A["fh-chop"] = stroke("fh-chop", FH_READY, {"x": 0, "z": -1.3, "turn": 0},
    back={"body.turn": 35, "torso.turn": 25, "r_leg.raise": 10, "l_leg.raise": 50, "r_knee.bend": 45, "l_knee.bend": 50, "r_arm.raise": 80, "r_arm.straddle": 40, "r_arm.turn": 55, "r_elbow.bend": 115, "r_wrist.turn": 55, "r_wrist.tilt": 25, "l_arm.raise": 45},
    contact={"torso.turn": 15, "r_knee.bend": 58, "l_knee.bend": 58, "r_arm.raise": 25, "r_arm.straddle": 25, "r_arm.turn": 50, "r_elbow.bend": 70, "r_wrist.turn": 60},
    follow={"torso.turn": 5, "torso.bend": 26, "r_arm.raise": 38, "r_arm.straddle": 6, "r_arm.turn": 40, "r_elbow.bend": 25, "r_wrist.turn": 55},
    dur=1.7, ball={"contactT": 0.6, "spin": "backspin", "from": [0.4, 1.0, 1.2], "bounce": [-0.3, 0.786, -1.0], "to": [0.4, 0.786, 1.0]},
    cues=[(0, "Ready, far back"), (0.3, "Side-on, bat by the shoulder"), (0.56, "Wait for the ball to drop"), (0.74, "High to low, and forward"), (0.9, "Recover")])

# ---------- Backhand family (front camera) ----------
A["bh-block"] = stroke("bh-block", BH_READY, {"x": 0, "z": 0.2, "turn": 0},
    back={"r_arm.raise": 42, "r_arm.turn": -68, "r_elbow.bend": 102, "r_wrist.turn": 35, "r_wrist.tilt": 28},
    contact={"r_arm.raise": 46, "r_arm.turn": -64, "r_elbow.bend": 96, "r_wrist.turn": 40},
    follow={"r_arm.raise": 48, "r_elbow.bend": 92},
    dur=0.95, ball=BH_BALL("topspin", ct=0.6, frm=(-0.45, 1.05, 1.25)), camera="front",
    cues=[(0, "Bat in front of your stomach"), (0.3, "No backswing"), (0.56, "Take it on the rise"), (0.74, "Angle over the ball"), (0.9, "Reset")])

A["bh-topspin"] = stroke("bh-topspin", BH_READY, {"x": 0, "z": -0.05, "turn": 0},
    back={"r_knee.bend": 62, "l_knee.bend": 62, "torso.bend": 24, "torso.turn": -8, "r_arm.raise": 26, "r_arm.straddle": 16, "r_arm.turn": -86, "r_elbow.bend": 110, "r_wrist.bend": 35, "r_wrist.turn": 10, "r_wrist.tilt": 20},
    contact={"r_knee.bend": 54, "l_knee.bend": 54, "torso.turn": 0, "r_arm.raise": 44, "r_arm.turn": -64, "r_elbow.bend": 96, "r_wrist.bend": 0, "r_wrist.turn": 28, "r_wrist.tilt": 28},
    follow={"r_knee.bend": 42, "l_knee.bend": 42, "torso.bend": 16, "r_arm.raise": 85, "r_arm.turn": -48, "r_elbow.bend": 82, "r_wrist.bend": -25, "r_wrist.turn": 55, "r_wrist.tilt": 38},
    dur=1.2, ball=BH_BALL("topspin", ct=0.6), camera="front",
    cues=[(0, "Ready, knees bent"), (0.3, "Elbow forward, bat below the ball"), (0.56, "Cock the wrist, then whip"), (0.74, "Finish at eye level"), (0.9, "Back to the middle")])

A["bh-flick"] = stroke("bh-flick", BH_READY, {"x": 0, "z": 0.05, "turn": 0},
    back={**STEP_IN, "torso.bend": 28, "r_arm.raise": 58, "r_arm.straddle": 26, "r_arm.turn": -82, "r_elbow.bend": 118, "r_wrist.bend": 50, "r_wrist.turn": 5, "r_wrist.tilt": 20},
    contact={"r_arm.raise": 56, "r_arm.turn": -72, "r_elbow.bend": 108, "r_wrist.bend": 10, "r_wrist.turn": 20},
    follow={"r_arm.raise": 62, "r_arm.turn": -58, "r_elbow.bend": 100, "r_wrist.bend": -30, "r_wrist.turn": 35},
    dur=1.4, phases=[("Ready", 0), ("Step in, cock the wrist", 0.38), ("Contact", 0.56), ("Follow-through", 0.7), ("Recover", 0.9)],
    root_back={"z": 0.3}, ball={"contactT": 0.56, "spin": "topspin", "from": [-0.3, 0.95, 1.2], "bounce": [0.25, 0.786, -0.4], "to": [-0.45, 0.786, 1.0]}, camera="front",
    cues=[(0, "Ready"), (0.32, "Elbow high, wrist cocked"), (0.53, "Flick out at the top"), (0.68, "Short finish"), (0.88, "Step back out")])

A["bh-chop"] = stroke("bh-chop", BH_READY, {"x": 0, "z": -1.3, "turn": 0},
    back={"body.turn": -35, "torso.turn": -25, "r_leg.raise": 50, "l_leg.raise": 10, "r_knee.bend": 50, "l_knee.bend": 45, "r_arm.raise": 75, "r_arm.straddle": 5, "r_arm.turn": -90, "r_elbow.bend": 130, "r_wrist.turn": -45, "r_wrist.tilt": 25},
    contact={"torso.turn": -12, "r_knee.bend": 58, "l_knee.bend": 58, "r_arm.raise": 32, "r_arm.straddle": 12, "r_arm.turn": -55, "r_elbow.bend": 85, "r_wrist.turn": -50, "r_wrist.bend": -35},
    follow={"torso.turn": -4, "torso.bend": 26, "r_arm.raise": 40, "r_arm.straddle": 15, "r_arm.turn": -60, "r_elbow.bend": 40, "r_wrist.turn": -45},
    dur=1.7, ball=BH_BALL("backspin", ct=0.6, bounce=(0.3, 0.786, -1.0)), camera="front",
    cues=[(0, "Ready, far back"), (0.3, "Bat up by the shoulder"), (0.56, "Down and forward under the ball"), (0.74, "Long finish"), (0.9, "Back to the middle")])

# ---------- Serves ----------
SERVE_STANCE = full(FH_READY, body__turn=55, torso__turn=20, head__turn=-45, r_leg__raise=12, l_leg__raise=46, r_knee__bend=42, l_knee__bend=40,
                    l_arm__raise=55, l_arm__straddle=8, l_arm__turn=0, l_elbow__bend=95, l_wrist__turn=60)


def serve(id, back, contact, follow, *, dur, spin, cues, camera=None, base=SERVE_STANCE, root=None):
    keys = [k(0, legs_ankle(copy.deepcopy(base)), root or {"x": 0.25, "z": 0.25, "turn": 0})]
    keys.append(k(0.3, legs_ankle({**base, "l_arm.raise": 95, "l_elbow.bend": 70})))
    keys.append(k(0.45, legs_ankle({**base, **back, "l_arm.raise": 70})))
    keys.append(k(0.62, legs_ankle({**base, **back, **contact, "l_arm.raise": 30, "l_arm.straddle": 30})))
    keys.append(k(0.78, legs_ankle({**base, **back, **contact, **follow, "l_arm.raise": 30, "l_arm.straddle": 30})))
    keys.append(k(1, legs_ankle(copy.deepcopy(base)), root or {"x": 0.25, "z": 0.25, "turn": 0}))
    apply_solved(id, keys)
    first = keys[0]["joints"]; prev = dict(first)
    for kk in keys[1:]:
        ch = {n: v for n, v in kk["joints"].items() if prev.get(n) != v}
        prev.update(kk["joints"]); kk["joints"] = ch
    ball = {"contactT": 0.62, "spin": spin, "serve": True, "from": [0.62, 1.02, -1.3], "bounce": [0.15, 0.786, -0.45], "to": [-0.15, 0.786, 0.45]}
    return anim(id, dur, [("Ready", 0), ("Toss", 0.3), ("Backswing", 0.45), ("Contact", 0.62), ("Follow-through", 0.78), ("Recover", 0.9)], keys, ball, cues, camera)

A["serve-pendulum"] = serve("serve-pendulum",
    back={"r_arm.raise": 55, "r_arm.straddle": 45, "r_arm.turn": 35, "r_elbow.bend": 110, "r_wrist.bend": -30, "r_wrist.turn": 50, "r_wrist.tilt": 15, "r_knee.bend": 50, "l_knee.bend": 46},
    contact={"r_arm.raise": 35, "r_arm.straddle": 30, "r_arm.turn": 50, "r_elbow.bend": 90, "r_wrist.bend": 15, "r_wrist.turn": 65},
    follow={"r_arm.raise": 32, "r_arm.straddle": 12, "r_arm.turn": 40, "r_elbow.bend": 85, "r_wrist.bend": 25},
    dur=2.2, spin="backspin",
    cues=[(0, "Ball on a flat palm"), (0.25, "Toss straight up, 16 cm or more"), (0.42, "Elbow up, wrist cocked"), (0.58, "Brush under, low"), (0.75, "Follow through"), (0.9, "Back to ready")])

A["serve-reverse-pendulum"] = serve("serve-reverse-pendulum",
    back={"r_arm.raise": 85, "r_arm.straddle": 25, "r_arm.turn": -35, "r_elbow.bend": 120, "r_wrist.bend": 20, "r_wrist.turn": -30, "r_wrist.tilt": 20, "r_knee.bend": 52, "l_knee.bend": 48},
    contact={"r_arm.raise": 65, "r_arm.straddle": 45, "r_arm.turn": -10, "r_elbow.bend": 105, "r_wrist.bend": -10, "r_wrist.turn": -45},
    follow={"r_arm.raise": 55, "r_arm.straddle": 60, "r_arm.turn": 10, "r_elbow.bend": 100, "r_wrist.bend": -20},
    dur=2.2, spin="sidespin",
    cues=[(0, "Ball on a flat palm"), (0.25, "Legal toss"), (0.42, "Elbow up, bat turned out"), (0.58, "Brush the free-hand side of the ball"), (0.75, "Swing out to your bat side"), (0.9, "Back to ready")])

A["serve-tomahawk"] = serve("serve-tomahawk",
    back={"r_arm.raise": 90, "r_arm.straddle": 55, "r_arm.turn": 45, "r_elbow.bend": 120, "r_wrist.bend": 0, "r_wrist.turn": 10, "r_wrist.tilt": 45, "r_knee.bend": 48, "l_knee.bend": 44},
    contact={"r_arm.raise": 60, "r_arm.straddle": 30, "r_arm.turn": 40, "r_elbow.bend": 100, "r_wrist.tilt": 40},
    follow={"r_arm.raise": 50, "r_arm.straddle": 10, "r_arm.turn": 25, "r_elbow.bend": 95, "r_wrist.tilt": 30},
    dur=2.2, spin="sidespin",
    base=full(SERVE_STANCE, body__turn=25, torso__turn=8, head__turn=-20),
    cues=[(0, "Ball on a flat palm"), (0.25, "Legal toss"), (0.42, "Bat tip up, elbow high"), (0.58, "Brush the bat-hand side of the ball"), (0.75, "Down and forward, like an axe"), (0.9, "Back to ready")])

A["serve-backhand"] = serve("serve-backhand",
    back={"r_arm.raise": 45, "r_arm.straddle": 15, "r_arm.turn": -88, "r_elbow.bend": 115, "r_wrist.bend": 35, "r_wrist.turn": -20, "r_wrist.tilt": 25},
    contact={"r_arm.raise": 42, "r_arm.turn": -70, "r_elbow.bend": 100, "r_wrist.bend": 0, "r_wrist.turn": -35},
    follow={"r_arm.raise": 45, "r_arm.turn": -50, "r_elbow.bend": 90, "r_wrist.bend": -20},
    dur=2.0, spin="backspin", camera="front",
    base=full(BH_READY, l_arm__raise=55, l_arm__straddle=8, l_arm__turn=0, l_elbow__bend=95, l_wrist__turn=60),
    root={"x": 0.05, "z": 0.25, "turn": 0},
    cues=[(0, "Square, ball in front"), (0.25, "Legal toss"), (0.42, "Elbow leads"), (0.58, "Wrist snaps at contact"), (0.75, "Short finish"), (0.9, "Reset")])

# ---------- Footwork ----------
FH_SHOT_BACK = {"torso.turn": 38, "body.turn": 12, "r_arm.raise": 0, "r_arm.straddle": 5, "r_arm.turn": 23, "r_elbow.bend": 87, "r_wrist.bend": -15, "r_wrist.tilt": 22}
FH_SHOT_HIT = {"torso.turn": 0, "body.turn": 0, "r_arm.raise": 13, "r_arm.straddle": 5, "r_arm.turn": 45, "r_elbow.bend": 75, "r_wrist.turn": -4, "r_wrist.tilt": 34, "r_wrist.bend": -15}


def footwork(id, keys_spec, *, dur, phases, cues):
    keys = []
    prev = {}
    for t, root, over in keys_spec:
        j = legs_ankle({**FH_READY, **over})
        ch = j if not keys else {n: v for n, v in j.items() if prev.get(n) != v}
        prev = j
        keys.append(k(t, ch, root))
    return anim(id, dur, phases, keys, None, cues, "top", footwork=True)

A["side-step"] = footwork("side-step", [
    (0, {"x": 0, "z": 0, "turn": 0}, {}),
    (0.15, {"x": -0.12}, {"r_leg.straddle": 20, "l_leg.straddle": 6, "r_knee.bend": 54}),
    (0.28, {"x": -0.32}, {"r_leg.straddle": 13, "l_leg.straddle": 11, **FH_SHOT_BACK}),
    (0.42, {"x": -0.32}, FH_SHOT_HIT),
    (0.6, {"x": -0.2}, {"l_leg.straddle": 20, "r_leg.straddle": 6, "l_knee.bend": 52}),
    (0.75, {"x": 0}, {"r_leg.straddle": 13, "l_leg.straddle": 11}),
    (1, {"x": 0, "z": 0, "turn": 0}, {}),
], dur=1.8, phases=[("Ready", 0), ("Push off, step", 0.15), ("Forehand", 0.42), ("Step back", 0.6), ("Ready", 0.85)],
   cues=[(0, "Ready"), (0.12, "Push off the far foot"), (0.4, "Play as you land"), (0.58, "Feet never cross"), (0.8, "Same height")])

A["crossover-step"] = footwork("crossover-step", [
    (0, {"x": 0.3, "z": 0, "turn": 0}, {}),
    (0.18, {"x": 0.1, "turn": 25}, {"r_leg.straddle": 22, "l_leg.straddle": -14, "l_leg.raise": 55, "l_knee.bend": 62, "body.turn": 15}),  # left foot crosses in front
    (0.34, {"x": -0.55, "turn": 15}, {"r_leg.straddle": 18, "l_leg.straddle": 6, "r_leg.raise": 26, **FH_SHOT_BACK}),
    (0.46, {"x": -0.6, "turn": 0}, FH_SHOT_HIT),
    (0.65, {"x": -0.35, "turn": 0}, {"l_leg.straddle": 20, "r_leg.straddle": 6}),
    (0.82, {"x": 0, "turn": 0}, {"r_leg.straddle": 13, "l_leg.straddle": 11}),
    (1, {"x": 0.3, "z": 0, "turn": 0}, {}),
], dur=2.2, phases=[("Ready on the backhand side", 0), ("Cross over", 0.18), ("Forehand", 0.46), ("Side step back", 0.65), ("Ready", 0.9)],
   cues=[(0, "Ready"), (0.15, "Push off, cross over"), (0.44, "Hit as the foot lands"), (0.62, "Side step back"), (0.88, "Back to the middle")])

A["pivot-step"] = footwork("pivot-step", [
    (0, {"x": 0, "z": 0, "turn": 0}, {}),
    (0.2, {"x": 0.25, "z": -0.15, "turn": 30}, {"r_leg.raise": 12, "r_leg.straddle": 18, "r_knee.bend": 56}),
    (0.36, {"x": 0.42, "z": -0.2, "turn": 45}, {"r_leg.raise": 20, **FH_SHOT_BACK}),
    (0.5, {"x": 0.42, "z": -0.2, "turn": 40}, FH_SHOT_HIT),
    (0.7, {"x": 0.2, "z": -0.08, "turn": 15}, {}),
    (0.85, {"x": 0, "z": 0, "turn": 0}, {}),
    (1, {"x": 0, "z": 0, "turn": 0}, {}),
], dur=2.0, phases=[("Ready", 0), ("Step back and around", 0.2), ("Forehand from the corner", 0.5), ("Recover", 0.7), ("Ready", 0.9)],
   cues=[(0, "Ready"), (0.18, "Back and around"), (0.48, "Side-on to the table"), (0.68, "Recover to the middle"), (0.88, "Ready")])

os.makedirs(OUT, exist_ok=True)
for id, a in A.items():
    with open(f"{OUT}/{id}.json", "w") as f:
        json.dump(a, f, indent=2)
        f.write("\n")
print("wrote", len(A))
