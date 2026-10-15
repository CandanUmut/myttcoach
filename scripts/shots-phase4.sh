#!/bin/sh
# Screenshots of every core screen at phone size with a seeded profile.
OUT=${1:-screenshots/p4}
PROFILE='{"name":"Umut","hand":"R","grip":"shakehand","ageBand":"35-49","level":3,"style":"allRoundAttacker","goals":["attack","serveReceive","footwork"],"moves":[{"id":"fh-loop-backspin","mode":"learn"},{"id":"bh-drive","mode":"improve"}],"workoutTypes":["technique","serveReceive"],"setups":["partner","multiball"],"schedule":{"days":[0,1,2,3,4,5,6],"time":"evening","length":60,"weeks":8,"startDate":"2026-10-12"},"goalMetric":{"metricId":"loop-backspin-10","start":4,"target":8,"targetDate":"2026-12-06"},"lowImpact":false,"voice":"calm","regenCount":0}'
SETUP="localStorage.setItem('thirdball:v1', JSON.stringify({schemaVersion:1, profile: $PROFILE, settings:{theme:'auto',sound:true,readCues:false}}))" \
node scripts/shot.mjs "$OUT" 390x844 /today=today /card=card /plan=plan /plan/s3=session /play/s3=player /learn=learn /learn/fh-loop-backspin=move /library=library /progress=progress /settings=settings
