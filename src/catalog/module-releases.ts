import { moduleChangelogs } from '../community/module-changelogs.ts'

// Release notes already require a valid date for every published version.
// Match the exact catalog version so unpublished future notes cannot reorder the library.
export function moduleReleasedAt(id: string, version: string): string | undefined {
  const release = moduleChangelogs[id]?.find(entry => entry.version === version)
  return release ? release.date + 'T00:00:00Z' : undefined
}
