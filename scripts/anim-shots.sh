#!/bin/sh
# Review shots for an animation: every phase from side and front.
# Usage: scripts/anim-shots.sh <animation-id> <outdir> t1 t2 ...
ID=$1; OUT=$2; shift 2
ROUTES=""
for t in "$@"; do ROUTES="$ROUTES /dev/shot/$ID/$t/side=${ID}_${t}_side /dev/shot/$ID/$t/front=${ID}_${t}_front"; done
FULL=0 WAIT=2200 node scripts/shot.mjs "$OUT" 480x400 $ROUTES 2>&1 | grep -v 404
