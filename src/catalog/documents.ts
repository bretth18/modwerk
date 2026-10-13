// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
import catalog from './module-documents.json' with { type: 'json' }
import { parseModuleDocument } from './module-contract.ts'
export const MODULE_DOCUMENTS = catalog.modules.map(parseModuleDocument)
export const MODULE_DOCUMENTS_BY_ID = Object.fromEntries(MODULE_DOCUMENTS.map(document=>[document.id,document]))
