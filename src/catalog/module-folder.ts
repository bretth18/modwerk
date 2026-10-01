import path from 'node:path'
import { lstat, realpath } from 'node:fs/promises'
import { modulePath } from './module-contract.ts'

/** True when `realPath` is outside `folder` (including symlink escapes). */
export function escapesModuleFolder(folder: string, realPath: string, paths = path): boolean {
  const rel = paths.relative(folder, realPath)
  return paths.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + paths.sep)
}

/** Validate the same file boundary used by module generation and media copying. */
export async function resolveModuleFile(folder: string, filePath: string): Promise<string> {
  modulePath(filePath)
  const target = path.resolve(folder, filePath)
  const info = await lstat(target)
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(filePath + ': expected a regular file')
  if (escapesModuleFolder(await realpath(folder), await realpath(target))) throw new Error(filePath + ': escapes module folder')
  return target
}
