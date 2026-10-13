"""Measure private 70 BPM 909 sweeps; retain numbers, never recordings.

python calibrate.py --reference-dir '.../909 70BPM' --output new-report.json
Requires numpy and scipy in a separate analysis environment. Physical knob
positions remain unknown; direct-out capture is owner-confirmed. No linear knob sweep
or physical-unit measurement is inferred from filenames.
"""
import argparse
import hashlib
import json
import wave
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares
from scipy.signal import lfilter


def read(path):
    with wave.open(str(path)) as w:
        if (w.getframerate(), w.getsampwidth(), w.getnchannels()) != (44100, 3, 2):
            raise ValueError('Expected 44.1 kHz stereo 24-bit PCM: ' + path.name)
        b = np.frombuffer(w.readframes(w.getnframes()), dtype=np.uint8).reshape(-1, 3).astype(np.int32)
    x = ((b[:,0] + (b[:,1] << 8) + (b[:,2] << 16)) ^ 0x800000) - 0x800000
    return x.reshape(-1,2).mean(axis=1) / 8388608


def profile(x, start=5733, stop=22050):
    """Fit harmonic amplitudes while estimating tail frequency and decay.

    All harmonics share one exponential envelope. Slow offset and constant
    terms are nuisance regressors. Per-hit phase/level are not normalized
    into a claim of waveform agreement.
    """
    harmonics=16
    t=np.arange(start,stop,5)/44100
    y=x[start:stop:5]
    def evaluate(p, coefficients=False):
        phase=2*np.pi*p[0]*t
        bases=np.column_stack([fn(h*phase) for h in range(1,harmonics+1) for fn in (np.cos,np.sin)])
        design=np.column_stack((bases*np.exp(-t[:,None]/np.exp(p[1])),np.exp(-t/.405),np.ones(len(t))))
        co=np.linalg.lstsq(design,y,rcond=None)[0]
        return co if coefficients else design@co-y
    fit=least_squares(evaluate,[45.7,np.log(.25)],bounds=([40,np.log(.04)],[55,np.log(1)]),xtol=1e-10,ftol=1e-10)
    co=evaluate(fit.x,True)
    a,b=co[:32:2],co[1:32:2]
    phase=np.arctan2(b[0],a[0]);h=np.arange(1,17)
    symmetric=a*np.cos(h*phase)+b*np.sin(h*phase)
    asymmetric=-a*np.sin(h*phase)+b*np.cos(h*phase)
    amp=np.hypot(a,b)
    return {'frequencyHz':float(fit.x[0]),'decaySeconds':float(np.exp(fit.x[1])),
            'residualDb':float(10*np.log10(np.mean(fit.fun**2)/np.mean(y*y))),
            'symmetric':(symmetric/symmetric[0]).tolist(),'asymmetric':(asymmetric/symmetric[0]).tolist(),
            'harmonicsDb':(20*np.log10(amp/amp[0])).tolist()}


def body_fit(profiles, base):
    """Fit complex body harmonics, retaining phase rather than only level.

    The even polynomial and u*(1+x) quadrature polynomial share a triangle
    phase. The endpoint factor joins continuously at each crest. This step
    retains the baseline mean; the separate full-hit fit adjusts DC/envelope.
    """
    phi=np.linspace(-np.pi,np.pi,8192,endpoint=False)
    u=phi/np.pi;x=1-2*np.abs(u)
    old=np.polynomial.polynomial.polyval(x,[base['body']['c0']]+base['body']['c'])
    dc=float(np.mean(old));fundamental=float(2*np.mean(old*np.cos(phi)))
    cosine=np.median([p['symmetric'] for p in profiles],axis=0)
    sine=np.median([p['asymmetric'] for p in profiles],axis=0)
    target=dc+fundamental*sum(a*np.cos((h+1)*phi)+b*np.sin((h+1)*phi)
                            for h,(a,b) in enumerate(zip(cosine,sine)))
    design=np.column_stack([x**k for k in range(12)]+[u*(1+x)*x**k for k in range(5)])
    coeff=np.linalg.lstsq(design,target,rcond=None)[0]
    def harmonics(y):
        amp=np.array([np.hypot(2*np.mean(y*np.cos(h*phi)),2*np.mean(y*np.sin(h*phi)))
                      for h in range(1,17)])
        return (20*np.log10(amp/amp[0])).tolist()
    return {'coefficients':coeff[:12].tolist(),'quadratureCoefficients':coeff[12:].tolist(),
            'referenceCosine':cosine.tolist(),'referenceSine':sine.tolist(),
            'referenceHarmonicsDb':np.median([p['harmonicsDb'] for p in profiles],axis=0).tolist(),
            'baselineHarmonicsDb':harmonics(old),'candidateHarmonicsDb':harmonics(design@coeff),
            'method':'Complex harmonic fit. Full-hit gain/DC/envelope and joint pulse refinement are separate bounded model fits.'}


def pulse_fit(low,high):
    """Separate Attack contribution using aligned high-minus-low hits.

    Variable projection solves pulse/coupling gains for each pole proposal.
    Bounds are explicit. A parameter hitting a bound remains a model limit.
    """
    delta=high[:1323]-low[:1323]
    def components(p):
        tau,fhp,flp,q,fu,fo=p
        up=-np.exp(-np.arange(len(delta))/(tau*44100))
        ahp=np.exp(-2*np.pi*fhp/44100)
        hp=lfilter([(1+ahp)/2,-(1+ahp)/2],[1,-ahp],up)
        w=2*np.pi*flp/44100;alpha=np.sin(w)/(2*q);a0=1+alpha
        b0=(1-np.cos(w))/2/a0
        resonant=lfilter([b0,2*b0,b0],[1,-2*np.cos(w)/a0,(1-alpha)/a0],hp)
        ku=1-np.exp(-2*np.pi*fu/44100)
        coupling=lfilter([ku],[1,-(1-ku)],up)
        kl=1-np.exp(-2*np.pi*fo/44100)
        return np.column_stack([lfilter([kl],[1,-(1-kl)],v) for v in (resonant,coupling)])
    def residual(p, coefficients=False):
        design=components(p);co=np.linalg.lstsq(design,delta,rcond=None)[0]
        return co if coefficients else design@co-delta
    initial=[.00013,800,5800,1,800,6565]
    lower=[.00003,30,1500,.5,20,3000];upper=[.005,6000,18000,4,8000,20000]
    fit=least_squares(residual,initial,bounds=(lower,upper),max_nfev=300,xtol=1e-9,ftol=1e-9)
    return {'parameters':dict(zip(('decaySeconds','hpHz','resonanceHz','q','couplingHz','outputHz'),fit.x.tolist())),
            'gains':residual(fit.x,True).tolist(),'rmsError':float(np.sqrt(np.mean(fit.fun**2))),
            'bounds':{'lower':lower,'upper':upper},'method':'High minus low aligned Attack medians; no uniform knob-position assumption.'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--reference-dir',type=Path,required=True)
    p.add_argument('--sdk',type=Path,default=Path(__file__).resolve().parent.parent.parent/'octabam')
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    if args.output.exists():
        p.error('Use a new output file')
    names={'attack':('BD Attack Rise.wav',48),'tune':('BD Tune Rise.wav',64),'joint':('BD Tune + Attack Rise.wav',48)}
    files={};signals={}
    for key,(name,count) in names.items():
        path=args.reference_dir/name
        signal=read(path)
        if len(signal)!=count*37800:
            raise ValueError('Expected one quarter-note hit per 70 BPM grid: '+name)
        signals[key]=signal.reshape(count,37800)
        files[name]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sampleRate':44100,'frames':len(signal),'gridSegments':count}
    attack=signals['attack']
    profiles=[profile(attack[i]) for i in range(1,13)]
    base=json.loads((args.sdk/'modules/analog-bassdrum/fit909.json').read_text())
    body=body_fit(profiles,base)
    aligned=[];edges=[]
    for hit in attack:
        edge=max(0,int(np.argmin(np.diff(hit[:400])))-2)
        edges.append(edge);aligned.append(hit[edge:edge+5000])
    aligned=np.array(aligned)
    low=np.median(aligned[1:9],axis=0);high=np.median(aligned[41:48],axis=0)
    pulse=pulse_fit(low,high)
    # Record adjacent-hit peak spread separately from sweep motion. A fitted
    # linear trend is removed, but unknown knob movement is still a confounder.
    peaks=np.max(np.abs(aligned[40:48,:441]),axis=1)
    trend=np.polyval(np.polyfit(np.arange(8),peaks,1),np.arange(8))
    variation={'endSegmentHits':[41,42,43,44,45,46,47,48],
               'peakCoefficientOfVariationAfterLinearDetrend':float(np.std(peaks-trend)/np.mean(peaks)),
               'peakValues':peaks.tolist(),
               'limit':'Knob positions are unknown. Residual spread is a design reference, not proof that it is intrinsic random circuit behavior. Grid-to-edge offsets are capture timing and are not synthesized as trigger jitter.'}
    holdout={key:[profile(signal[i],start=11025,stop=28665) for i in indices] for key,signal,indices in
             [('attack',signals['attack'],[24,32,40,47]),('tune',signals['tune'],[0,16,32,48,63]),('joint',signals['joint'],[0,16,32,47])]}
    report={'schema':1,'date':'2026-10-09','referenceFiles':files,'trainingHits':list(range(2,14)),
            'body':body,'pulse':pulse,'neighborVariation':variation,'alignedAttackEdgeSamples':edges,'holdoutProfiles':holdout,
            'limits':['The audio report identifies a decay-modified TR-909 and decay a little above halfway. Other fixed physical values and processing chain remain unspecified.',
                      'Complex harmonics are fitted; full waveform agreement is checked separately on complete native hits.',
                      'Tune intermediate values are a design interpolation; physical knob trajectories were not recorded.',
                      'Software model fitting is not physical-device or full-firmware qualification.']}
    args.output.write_text(json.dumps(report,indent=2)+'\n')
    print('Wrote numerical reference report; recordings remain private:',args.output)


if __name__=='__main__':
    main()
