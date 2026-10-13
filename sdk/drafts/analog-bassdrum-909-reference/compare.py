"""Compare private native WAV previews with the private 909 Attack sweep.

Run after calibrate.py and run.py. Tail-RMS normalization uses one fixed
factor per engine from the first hit, never separate attack peak gains.
Requires numpy/scipy; optional plotting needs matplotlib. No audio is saved.
"""
import argparse
import hashlib
import json
import wave
from pathlib import Path

import numpy as np
from calibrate import profile, read


def mono(path):
    with wave.open(str(path)) as w:
        if (w.getframerate(), w.getsampwidth(), w.getnchannels()) != (44100, 3, 1):
            raise ValueError('Expected native mono 44.1 kHz 24-bit PCM')
        b=np.frombuffer(w.readframes(w.getnframes()),dtype=np.uint8).reshape(-1,3).astype(np.int32)
    return (((b[:,0]+(b[:,1]<<8)+(b[:,2]<<16))^0x800000)-0x800000)/8388608


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--reference-dir',type=Path,required=True)
    p.add_argument('--calibration',type=Path,required=True)
    p.add_argument('--audition-dir',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--plot',type=Path)
    args=p.parse_args()
    if args.output.exists() or (args.plot and args.plot.exists()):
        p.error('Use new output paths')
    calibration=json.loads(args.calibration.read_text())
    refpath=args.reference_dir/'BD Attack Rise.wav'
    if hashlib.sha256(refpath.read_bytes()).hexdigest()!=calibration['referenceFiles'][refpath.name]['sha256']:
        raise ValueError('Calibration does not describe these recordings')
    ref=read(refpath).reshape(-1,37800)
    aligned=np.array([hit[edge:edge+30870] for hit,edge in zip(ref,calibration['alignedAttackEdgeSamples'])])
    targets=[np.median(aligned[1:9],axis=0),np.median(aligned[-4:],axis=0)]
    tail=lambda x:float(np.sqrt(np.mean(x[5733:22050]**2)))
    signals={};results={}
    for name in ('current-013','candidate-014'):
        path=args.audition_dir/(name+'.wav');x=mono(path);signals[name]=x
        if len(x)!=18*37800:
            raise ValueError('Use the 18-hit audition from run.py')
        scale=tail(ref[5])/tail(x[:37800])
        fitted=profile(x[:37800])
        holdout=calibration['holdoutProfiles']['attack']
        h2h5=np.array([q['harmonicsDb'][1:5] for q in holdout])
        results[name]={'wavSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                       'fixedTailRmsScale':scale,'bodyProfile':fitted,
                       'fullHitRmsError':{label:{span:float(np.sqrt(np.mean((x[j*37800+lo:j*37800+hi]*scale-target[lo:hi])**2))) for span,lo,hi in [('0-10ms',0,441),('20-700ms',882,30870)]} for label,j,target in zip(('low','high'),(0,4),targets)},
                       'meanAbsoluteH2ToH5QuadratureError':float(np.mean(np.abs(np.median([q['asymmetric'][1:5] for q in holdout],axis=0)-np.array(fitted['asymmetric'][1:5])))),
                       'meanAbsoluteH2ToH5ErrorAgainstAttackHoldoutDb':float(np.mean(np.abs(h2h5-np.array(fitted['harmonicsDb'][1:5])))),
                       'attackFirst10msRmsError':{label:float(np.sqrt(np.mean((x[j*37800:j*37800+441]*scale-target[:441])**2)))
                                                for label,j,target in zip(('low','high'),(0,4),targets)}}
    report={'schema':1,'date':'2026-10-09','comparisons':results,
            'method':'Native PCM; 70 BPM; low hits 2..9 and final four high-Attack medians; full-hit error from 20..700 ms; one fixed tail-RMS level factor per engine, no phase search. H2-H5 body magnitudes checked against four held-out Attack hits (25,33,41,48).',
            'limits':['Attack endpoint medians also informed fitting and are not an independent validation set.',
                      'Direct-out capture is owner-confirmed; intermediate physical knob positions, external processing and exact component tolerances remain unspecified.',
                      'Harmonic magnitude agreement does not prove temporal phase or full waveform agreement.',
                      'The two native previews use identical controls; the old high-Attack signal reaches its output limit.']}
    args.output.write_text(json.dumps(report,indent=2)+'\n')
    if args.plot:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig,axes=plt.subplots(2,2,figsize=(12,6))
        for row,(j,target) in enumerate(zip((0,4),targets)):
            for col,limit in enumerate((441,2205)):
                ax=axes[row,col];t=np.arange(limit)/44.1
                ax.plot(t,target[:limit],label='909 recording median')
                for name in signals:
                    ax.plot(t,signals[name][j*37800:j*37800+limit]*results[name]['fixedTailRmsScale'],label=name,alpha=.8)
                ax.set_title(('Low' if row==0 else 'High')+' Attack');ax.set_xlabel('Time from attack (ms)');ax.legend(fontsize=8)
        fig.tight_layout();fig.savefig(args.plot,dpi=150)
    print('Wrote native-to-reference numerical comparison:',args.output)


if __name__=='__main__':
    main()
