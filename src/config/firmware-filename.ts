export function firmwareFilename(configurationName: string, sha256: string): string {
  const name = configurationName
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '') || 'configuration'
  return `Modwerk-octatrack-${name}-${sha256.slice(0, 6).toLowerCase()}.bin`
}
