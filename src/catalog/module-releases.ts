// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
import { moduleChangelogs } from '../community/module-changelogs.ts'

// Release notes already require a valid date for every published version.
// Match the exact catalog version so unpublished future notes cannot reorder the library.
export function moduleReleasedAt(id: string, version: string): string | undefined {
  const release = moduleChangelogs[id]?.find(entry => entry.version === version)
  return release ? release.date + 'T00:00:00Z' : undefined
}
