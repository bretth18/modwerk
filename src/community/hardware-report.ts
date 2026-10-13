// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
type ReportModule = { name: string; version: string }
export type HardwareReport = { machine: string; os?: string; module: ReportModule; companions: ReportModule[]; comment: string }

function reportModule(value: string): ReportModule | null {
  const match = value.match(/^(.+) (\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)$/)
  return match ? { name: match[1], version: match[2] } : null
}

/** Recognize the complete, generated opening paragraph only. Saved text, quotes and free-form replies stay intact. */
export function readHardwareReport(body: string): HardwareReport | null {
  const match = body.match(/^\*\*Works on my ([^*\r\n]+)\*\*(?: \(OS ([^()\r\n]+)\))? · ([^\r\n]+)\.(?:\r?\n\r?\n|$)/)
  if (!match) return null
  const [tested, together, ...extra] = match[3].split(', built together with ')
  const module = reportModule(tested)
  const companions = together === undefined ? [] : together.split(', ').map(reportModule)
  if (!module || extra.length || !companions.every((item): item is ReportModule => item !== null)) return null
  return { machine: match[1], os: match[2], module, companions, comment: body.slice(match[0].length) }
}
