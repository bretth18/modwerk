# Unwired Analog BD Part retirement fence

`mw_ab_part_fence` is a conservative, read-only additional removal predicate.
It uses the exact imported Analog BD semantics: FLEX type1 at Part+0x22+track
and the three-byte AB/1 marker at Part+60+30*track. It never interprets that
version1 marker as an encoded-package identity, generation or ownership handoff.
Imported source hashes are pinned in the SDK test.

The fixed model reads every sixteen-bank working/saved Part, all four current
CS1 working/saved mirrors and bounded actual current/paused extra Parts. It
validates the actual current-bank pointer before deriving addresses and preserves
its canonical/uncached RAM alias. Each memory read is at most four bytes and
must return exactly1. Missing callbacks, unreadable bytes, invalid addresses,
unsupported AB revisions/types, unknown machine types or an incomplete/oversized
extra-Part enumeration refuse clearance. FLEX1+AB/1 retains the owner.

The extra-Part callback is a trusted board collector interface. Zero means an
independently complete end of actual current/paused Parts, not an uploaded flag.
No board collector is implemented or qualified here. Fixtures provide synthetic
read/enumeration events only. A missing actual collector stays closed.

A qualified stable snapshot must cover the entire read-only observation and
subsequent retirement decision. It must also respect the instrument's frame
interrupt deadlines; this scan is not permission to mask level5+ through all
banks. Native C regressions and ColdFire compilation do not qualify physical
read timing or scheduler behavior. Keep unknown state retained.

CLEAR means only that this additional observed Part-marker set had no retained
AB owner. The independent whole-controller-image, retained UI handler/label,
current/paused execution, actual DSP disable/job acknowledgments and foreign-root
fences must also pass against the same immutable generation before retirement.
Removing or replacing a marker requires the separate exact twelve-byte FLEX
restoration and publication proof; this helper writes no Part or control data.
No caller readiness, unsigned generation or host mode-off value can bypass it.

The helper has no loader wiring, production source registry, enable path or
public admission. It does not qualify descriptor ownership, group composition,
DSP audio/headroom, complete-base fit, physical timing, persistence or reboot.
All CI fixture data is authored synthetic state; no firmware is required.
