// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
import { handleCommunity } from '../../server/transport'
import type { Env } from '../../server/platform'
export function onRequest(context: { request: Request; env: Env; waitUntil(promise: Promise<unknown>): void }) { return handleCommunity(context.request, context.env, context) }
