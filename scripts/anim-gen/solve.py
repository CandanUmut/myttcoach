"""Solve arm angles for the targets in targets.json (bat position, face direction) and regenerate.
Usage: python3 scripts/anim-gen/solve.py [animation ids...]"""
import json,subprocess,sys,os
S=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(S,'..','..'))
T=json.load(open(f'{S}/targets.json'))
only=sys.argv[1:]
solved=json.load(open(f'{S}/solved.json')) if os.path.exists(f'{S}/solved.json') else {}
for id,keys in T.items():
    if only and id not in only: continue
    # solve against a fresh generation without this id's overrides
    solved.pop(id,None); json.dump(solved,open(f'{S}/solved.json','w'),indent=1)
    subprocess.run(['python3',f'{S}/gen_anims.py'],check=True,capture_output=True)
    for t,tg in keys.items():
        out=subprocess.run(['npx','vite-node','scripts/solve-pose.ts',f'content/animations/{id}.json',t,json.dumps(tg)],capture_output=True,text=True,cwd=ROOT).stdout.strip().splitlines()
        print(id,t,out[0])
        solved.setdefault(id,{})[t]=json.loads(out[1])
    json.dump(solved,open(f'{S}/solved.json','w'),indent=1)
subprocess.run(['python3',f'{S}/gen_anims.py'],check=True)
