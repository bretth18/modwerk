// SPDX-License-Identifier: GPL-3.0-or-later
/** POSIX mode checks cannot establish an owner-only native Windows DACL.
 * This is a host capability check, never a caller-selected tool argument. */
export function assertMcpPrivateHost() {
  if (process.platform === 'win32') throw new Error('Native Windows MCP is unavailable until its owner-only ACL lifecycle is implemented. Use macOS, Linux, or WSL with a Linux filesystem.')
}
