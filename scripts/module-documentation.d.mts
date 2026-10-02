import type { ModuleDocument } from '../src/catalog/module-contract.ts'
export const REQUIRED_README_SECTIONS: string[]
export function requireCompleteReadme(document: ModuleDocument, readme: string): void
export function requireMonochromePng(bytes: Buffer): void
export function requireModuleDocumentation(folder: string, document: ModuleDocument): Promise<void>
