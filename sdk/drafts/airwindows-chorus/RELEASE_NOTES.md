# 0.1.0-experimental — development candidate, 8 October 2026

- Port Chris Johnson's MIT-licensed Airwindows Chorus to Octatrack FX2,
  preserving its fourth-power SPEED/RANGE curves, shared stereo phase,
  air compensation, three-point read and MIX/depth interaction.
- Add 48-bit per-sample control slews, with cascaded RANGE/MIX stages to
  pass measured jump/turn checks including full 0–127 endpoint changes.
- Use per-instance stereo rings, safe dry handling of stale FX1 IDs,
  deterministic initialization and exact settled dry bypass.
- Retain original source, Chris Johnson's credit and full MIT notice.
- Replace the synchronous delay-buffer clear with bounded valid-history
  initialization; finite native audio fixtures remain byte-identical.
- The owner reports a successful 50-minute MKII test of the earlier image
  with several instances and full knob sweeps. Fresh hardware testing of the
  initialization update is explicitly owner-waived; persistence, modulation
  and eight-track hardware coverage remain unverified. Integration and
  publication remain pending. Buffer precision differs from the float plugin; extreme
  delay modulation retains pitch/aliasing artifacts. No public release yet.

When qualified and added to `sdk/catalog.json`, copy this version-matched
entry to `src/community/module-changelogs.json` before generation. That file
rejects unknown IDs, so an unlisted development candidate cannot go there yet.

Promotion also adds Chorus usage and its source pin to the existing Airwindows
component in `sdk/octabam/licenses/manifest.json`, then regenerates notices
and recompiles packages. The global native licence inventory is part of the
published package fingerprint; changing it during draft staging would
invalidate unrelated existing package records. Full notices and Chris
Johnson's attribution are already retained within this candidate.
