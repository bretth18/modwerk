# SPDX-License-Identifier: GPL-3.0-or-later
from pathlib import Path
import sys,shutil,json,hashlib
w,sdk,seed=map(Path,sys.argv[1:])
sys.path.insert(0,str(sdk/'tools'));import toolpath
import emu_card
p=w/'project';p.mkdir(exist_ok=True)
for src in (seed).iterdir():
 if src.suffix in ('.work','.strd'):shutil.copyfile(src,p/src.name)
(w/'empty-tree').mkdir(exist_ok=True);(w/'empty.img').write_bytes(emu_card.build_image(str(w/'empty-tree'),32))
import stress_project as stress
from hw import ot_project as otp
stress.set_project_text(p);stress.set_markers(p)
for n in range(1,17):
 if (p/f'bank{n:02d}.work').exists():otp._bank_write(p,n,lambda data,number=n:stress.mutate_bank(data,number,{},([None]*8,[None]*8),()),guard=False)
for path in [p/'project.work',p/'project.strd']:
 if path.exists():path.write_bytes(path.read_bytes().replace(b'PATH=AUDIO/STRESS_LOOP.wav',b'PATH=../AUDIO/STRESS_LOOP.wav'))
otp.write_stored(p)
stress.make_sample(p/'AUDIO/STRESS_LOOP.wav')
img,name=emu_card.stage_project(str(p),'MIDISC','MEASURE',tree=str(w/'stress-tree'),image_mb=32,audio=[str(p/'AUDIO/STRESS_LOOP.wav')+':AUDIO/STRESS_LOOP.wav'])
(w/'stress.img').write_bytes(img)
print(json.dumps({'tracks':8,'audioLfos':24,'fourPatterns':'16/32/64 dense steps then 64 trigless-lock steps','cardBytes':len(img),'sha256':hashlib.sha256(img).hexdigest()}))
