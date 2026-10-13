export type FirmwareBuildManifest = {
  format: 'modwerk-firmware-builder-v1'
  inputsSha256: string
  elekloader: { version: string; commit: string; protocol: number; catalogSha256: string }
}
export function sha256(bytes: Uint8Array | string): string
export function readFirmwareBuildManifest(root: string): Promise<FirmwareBuildManifest>
