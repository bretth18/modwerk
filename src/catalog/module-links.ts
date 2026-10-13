// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
/** Public names can change without changing native module or saved configuration IDs. */
export function moduleSlug(id: string) { return id === 'synth' ? 'fm-synth' : id }
export function moduleIdFromSlug(slug: string) { return slug === 'fm-synth' ? 'synth' : slug }
export function modulePath(id: string) { return 'module/' + moduleSlug(id) + '/' }
