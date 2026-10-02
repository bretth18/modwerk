// Visitor-facing wording for composition refusals. Native wording is matched, never shown.
const DSP_SPACE = /overruns the region|does not fit any harvested run/
/** Module menu code, chooser lists and hooks that do not fit the free OS regions. DSP placement is separate. */
export function isMenuSpaceFailure(detail: string) {
  return !DSP_SPACE.test(detail) && /does not fit|do not fit|exceeds its reserved region|need more space/.test(detail)
}
/** stockSwitch: the Keep stock FX2 effects switch is offered and on (loader builds only). */
export function explainBuildFailure(detail: string, stockSwitch = false): string {
  // Stock FX2 kept and a module needs DSP room: nothing is free to take.
  if (/nowhere to place/.test(detail)) return stockSwitch
    ? 'These modules need space used by the stock FX2 effects. Turn off Keep stock FX2 effects, then check again.'
    : 'These modules need space used by the stock FX2 effects. Remove one of them, then check again.'
  // Modules together are larger than the DSP space the FX2-only reverbs can give up.
  if (DSP_SPACE.test(detail)) return 'These modules do not fit together in the available effect memory. Remove one of them, then check again.'
  if (isMenuSpaceFailure(detail)) return stockSwitch
    ? 'These modules and stock FX2 effects do not fit together. Turn off Keep stock FX2 effects or remove a module, then check again.'
    : 'These modules do not fit together. Remove one of them, then check again.'
  return detail
}
