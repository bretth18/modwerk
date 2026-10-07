import { MODULE_DOCUMENTS_BY_ID } from './documents'

// The hardware record behind an Octatrack module, added to the stability grade's explanation on its library card.
export function moduleHardwareEvidence(id: string): string {
  const status = MODULE_DOCUMENTS_BY_ID[id].tests.hardwareStatus
  if (status === 'reported') return 'A hardware test of this version was reported.'
  if (status !== 'untested') return 'Hardware evidence comes from an earlier version.'
  return 'Tested in the emulator only.'
}
