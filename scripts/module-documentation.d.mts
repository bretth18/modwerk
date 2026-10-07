import type { ModwerkModule } from '../src/catalog/module-contract-v3.ts'
import type { ModuleDocument } from '../src/catalog/module-contract.ts'
export const REQUIRED_README_SECTIONS: string[]
// A draft can validate its tutorial without asserting cycle/hardware qualification.
type ReadmeDraft = { id: string; tests: { qualification: Pick<NonNullable<ModuleDocument['tests']['qualification']>, 'documentation'> } }
export function requireCompleteReadme(document: ModuleDocument | ModwerkModule | ReadmeDraft, readme: string): void
export function requireMonochromePng(bytes: Buffer): void
export function requireModuleDocumentation(folder: string, document: ModuleDocument): Promise<void>

export function requireModwerkDocumentation(folder: string, document: ModwerkModule): Promise<void>
