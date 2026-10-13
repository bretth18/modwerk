/* SPDX-License-Identifier: GPL-3.0-or-later
 * Reviewed private source-fixture ABI. No production admission or public import yet.
 */
#ifndef MODWERK_STOCK_HOOK_WRITE_LEASE_H
#define MODWERK_STOCK_HOOK_WRITE_LEASE_H
#include <stdint.h>
#include <stddef.h>
#define MW_CONTROLLER_WRITE_LEASE_BYTES 32u
#define MW_CONTROLLER_WRITE_SIDECHAIN 1u
#define MW_CONTROLLER_WRITE_MATRIX 2u
#define MW_CONTROLLER_WRITE_ANALOG_BD 4u
/* Exactly eight opaque BE-independent native32-bit words, aligned4 on MCF.
 * Caller owns writable stack storage. It supplies no identity/generation/SR.
 * Begin fills this only after resolving entry to reviewed pending/current
 * whole-image extent+encoded/source identity+board generation. A raw pointer
 * or feature bit grants no authority. Required predicates must equal1.
 */
struct mw_controller_write_lease { uint32_t opaque[8]; };
/* MCF C ABI: args entry(uintptr32),feature(uint32),lease(pointer32), D0 result.
 * Exactly1: real stable lock and generation lease retained across authored
 * control writes. Zero: no lease acquired/no write permission. No weak default.
 * Wrappers may restore CCR but never full saved SR during retained writes.
 * Permit only actual ACKed/released PUBLISHING or CF-confirmed ACTIVE.
 * Nested/reused live leases refuse; there is one independently owned backend
 * write ticket at a time. Gate failure performs no reset/CAS/publication/save.
 */
int modwerk_controller_write_begin(uintptr_t entry, uint32_t feature,
                                   struct mw_controller_write_lease *lease);
/* Call exactly once on every successful Begin, after all controller/control
 * writes and before unrelated redraw/notification work where proven safe.
 * Backend validates its own active ticket/generation/storage association,
 * then restores the original lock state; caller words alone are not proof.
 * Unknown/corrupt end quarantines the association and retained images rather
 * than granting retirement. Backend restores the original IRQ state from its
 * independently held active record, never caller opaque words, even on such
 * failure; a failed End must not strand a global interrupt lock.
 * Wrappers preserve authored output registers/CCR around End. End failure exits
 * immediately: no replay/retry of stock or custom writes and no further writes.
 * This does not prove stock-call IRQ/block timing.
 */
int modwerk_controller_write_end(struct mw_controller_write_lease *lease);
#endif
