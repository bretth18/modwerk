import metadata from './native-metadata.json'
import { CATALOG_SOURCE, resolveSelection } from './modules'
import { moduleBuildError } from './build-support'
import { selectionConflicts } from './selection-conflicts'
export function checkSelection(ids: readonly string[], keepStockFx2 = false) {
 const modules=resolveSelection(ids), conflicts=selectionConflicts(ids, keepStockFx2)
 const result=(notes:string[],checked=false)=>({issues:[...conflicts.map(conflict=>conflict.description),...notes],notes,conflicts,checked:checked&&!conflicts.length})
 if(!modules.length)return result([])
 const pending=moduleBuildError(ids)
 if(pending)return result([pending])
 if(metadata.revision!==CATALOG_SOURCE.revision)return result(['Compatibility metadata does not match this catalog revision.'])
 if(modules.length===1&&modules[0].id==='midi-scenes')return result([],true)
 if(conflicts.length)return result([])
 const key=modules.map(m=>m.id).sort().join('+')
 const checks:Record<string,string[]>=metadata.checks
 return result(checks[key]??['This selection has no recorded declaration check.'],key in checks)
}
