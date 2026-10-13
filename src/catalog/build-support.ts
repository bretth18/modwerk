// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
import { MODULE_DOCUMENTS_BY_ID } from './documents.ts'
import { resolveSelection } from './modules.ts'

export function moduleBuildPending(id: string) {
  return MODULE_DOCUMENTS_BY_ID[id]?.build?.status === 'pending'
}

export function moduleBuildError(ids: readonly string[]): string {
  const pending = resolveSelection(ids).filter(module => moduleBuildPending(module.id))
  return pending.length ? pending.map(module => module.name).join(', ') + ': firmware builds are awaiting Octamod verification. You can save this configuration while verification is pending.' : ''
}
