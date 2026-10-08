import json,math
from pathlib import Path
base=Path(__file__).resolve().parent
exec((base/'test.py').read_text().split("report={'static'")[0])
rows=[]
for name,initial in [('909',bd909.INIT),('808',bd808.INIT)]:
 for control in ((4,5) if name=='909' else (5,)):
  for start,end in ((0,127),(127,0)):
   k=initial.copy();k[1]=127;k[3]=0;k[7]=40;k[control]=start
   h=k.copy();h[control]=end
   hold=[(k,0 if b==0 else None) for b in range(192)]
   change=[(k,0 if b==0 else None) for b in range(128)]+[(h,None)]*64
   tag=f'{name}-{control}-{start}'
   new,_,_=run(name,change,'probe-new-'+tag,frames=1)
   held,_,_=run(name,hold,'probe-held-'+tag,frames=1)
   old,_,_=run(name,change,'probe-old-'+tag,baseline=True,frames=1)
   oldheld,_,_=run(name,hold,'probe-oldheld-'+tag,baseline=True,frames=1)
   abrupt=abs(old[128]-oldheld[128]);smooth=abs(new[128]-held[128])
   db=20*math.log10(max(smooth,1)/max(abrupt,1))
   assert db < -15,(name,control,start,db)
   rows.append({'engine':name,'control':'TDEP' if control==4 else 'SAT','from':start,'to':end,'firstSampleParameterDeltaBefore':abrupt,'firstSampleParameterDeltaAfter':smooth,'reductionDb':-db})
   print('PASS onset artifact reduction',name,control,start,'to',end,round(-db,1),'dB',flush=True)
(base/'probe-report.json').write_text(json.dumps(rows,indent=2)+'\n')
