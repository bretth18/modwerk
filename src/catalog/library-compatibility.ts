import { selectionConflicts, type SelectionConflict } from './selection-conflicts'
import { addBlocks, type AddBlock } from './add-blocks'

/** Baked/card placement belongs to the card checkout. USB sets use published
 * package checks and the unit's resource/ownership admission when they sync.
 * This changes library feedback only; it never authorizes a package or load. */
export function libraryCompatibility(beta: boolean, ids: readonly string[], keepStockFx2: boolean, candidates: readonly string[]): { conflicts: SelectionConflict[]; blocks: Record<string, AddBlock> } {
  return beta ? { conflicts: [], blocks: {} } : {
    conflicts: selectionConflicts(ids, keepStockFx2),
    blocks: addBlocks(ids, keepStockFx2, candidates),
  }
}
