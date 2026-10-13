"""Private direct-out onset/neighbor comparison. Requires numpy and scipy.

Band analysis includes 512 samples before the steep attack edge. Cutting the
reference at that edge creates an artificial discontinuity and false treble.
Shape spread removes fitted transient level and sub-sample alignment; it is a
descriptive measurement, not a claim about a circuit or a random distribution.
"""
import argparse, hashlib, json, sys
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
from scipy.ndimage import shift
from scipy.optimize import minimize_scalar
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from calibrate import read
from compare import mono
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--reference-dir', type=Path, required=True)
p.add_argument('--calibration', type=Path, required=True)
p.add_argument('--emulator', type=Path, required=True)
p.add_argument('--gain', type=float, required=True)
p.add_argument('--hit-indices', default='0,1,2,3,4,5,6,7')
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
if a.output.exists(): p.error('Use a new private output file')
sha = lambda f: hashlib.sha256(f.read_bytes()).hexdigest()
path = a.reference_dir / 'BD Attack Rise.wav'
cal = json.loads(a.calibration.read_text())
assert sha(path) == cal['referenceFiles'][path.name]['sha256']
raw = read(path); emu = mono(a.emulator) * a.gain
indices = [int(i) for i in a.hit_indices.split(',')]
assert len(indices) >= 4 and len(emu) >= (max(indices)+1)*37800
edges = cal['alignedAttackEdgeSamples']
full = lambda x, center: x[center-512:center+4096]
refs = [full(raw, i*37800+edges[i]) for i in range(44,48)]
# Exclude the first synthesized hit so the pre-roll is actual carried state.
ems = [full(emu, i*37800) for i in indices if i>0]
bands = [(2000,4000),(4000,8000),(8000,12000),(12000,18000),(18000,21500)]
def band_energy(x, b):
    f = butter(4, b, fs=44100, btype='bandpass', output='sos')
    z = sosfilt(f, x, zi=sosfilt_zi(f)*x[0])[0]
    return float(np.sum(z*z))
re = np.median([[band_energy(x,b) for b in bands] for x in refs],axis=0)
ee = np.median([[band_energy(x,b) for b in bands] for x in ems],axis=0)
def neighbors(x, centers):
    waves = []; rows = []
    for center in centers:
        y = full(x,center); tail = x[center+5733:center+22050]
        rms = float(np.sqrt(np.mean(tail*tail))); peak = float(np.max(np.abs(y)))
        waves.append(y/rms); rows.append({'peak':peak,'tailRms':rms,'tailNormalizedPeak':peak/rms})
    peaks = np.array([r['tailNormalizedPeak'] for r in rows])
    center = np.mean(waves,axis=0); aligned=[]; nuisance=[]
    for y in waves:
        def loss(offset, result=False):
            z=shift(y,offset,order=5,mode='nearest'); span=slice(480,1400)
            gain=np.dot(z[span],center[span])/np.dot(z[span],z[span])
            return (z*gain,gain) if result else np.mean((z[span]*gain-center[span])**2)
        fit=minimize_scalar(loss,bounds=(-1.5,1.5),method='bounded')
        z,gain=loss(fit.x,True);aligned.append(z);nuisance.append({'alignmentSamples':float(fit.x),'transientGain':float(gain)})
    zs=np.array(aligned);mean=np.mean(zs,axis=0)
    spread={label:float(np.sqrt(np.mean((zs[:,lo:hi]-mean[lo:hi])**2))/np.sqrt(np.mean(mean[lo:hi]**2))) for label,lo,hi in [('0-10ms',512,953),('10-30ms',953,1835)]}
    trend=np.polyval(np.polyfit(np.arange(len(peaks)),peaks,1),np.arange(len(peaks)))
    return {'hits':rows,'tailNormalizedPeakCv':float(np.std(peaks)/np.mean(peaks)),
            'detrendedTailNormalizedPeakCv':float(np.std(peaks-trend)/np.mean(peaks)),
            'shapeRmsSpreadAfterLevelAndAlignment':spread,'nuisanceFits':nuisance}
report={'schema':1,'candidateVersion':'0.1.4-experimental','referenceSha256':sha(path),'emulatorWavSha256':sha(a.emulator),'analysisToolSha256':sha(Path(__file__)),
        'method':'Median fourth-order causal bandpass energy with 512 pre-roll and 4096 post-edge samples, DC-initialized filters; actual carried-state emulator hits after the first. One fixed tail-RMS listening gain after stock AMP compensation. No per-peak gain is used for spectral comparison.',
        'bandsHz':bands,'relativeBandEnergyDb':(10*np.log10(ee/re)).tolist(),'commonListeningGain':a.gain,
        'referenceFinalEight':neighbors(raw,[i*37800+edges[i] for i in range(40,48)]),
        'referenceFinalFour':neighbors(raw,[i*37800+edges[i] for i in range(44,48)]),
        'emulatorEqualControlHits':neighbors(emu,[i*37800 for i in indices if i>0]),
        'limits':['Only 2–4 final reference hits may hold the endpoint; their rising peak trend can still contain knob movement.',
                  'Eight-hit detrended spread is an estimate, not a clean measured random-strength target.',
                  'Reference shape spread includes capture noise, residual knob motion and interpolation uncertainty.',
                  'Synthesized variation is pseudorandom strength plus shaped noise, not a reconstruction of each physical hit.',
                  'This is an emulator comparison, not physical audio or clock/persistence validation.']}
a.output.write_text(json.dumps(report,indent=2)+'\n')
print('Full-onset band error dB:', report['relativeBandEnergyDb'])
print('Reference final four:',report['referenceFinalFour']['tailNormalizedPeakCv'],report['referenceFinalFour']['shapeRmsSpreadAfterLevelAndAlignment'])
print('Emulator neighbors:',report['emulatorEqualControlHits']['tailNormalizedPeakCv'],report['emulatorEqualControlHits']['shapeRmsSpreadAfterLevelAndAlignment'])
