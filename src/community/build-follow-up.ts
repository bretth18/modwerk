import { communityModule } from './modules'

/** A module in a downloaded build, named by its community ID so it maps to one home thread. */
export type BuiltModule = { id: string; name: string; version: string }

/** The catalog modules in a build, with the versions the build used where it reports them. Unknown IDs are dropped. */
export function builtModules(ids: readonly string[], versions: Readonly<Record<string, string>> = {}): BuiltModule[] {
  return ids.flatMap(id => {
    const module = communityModule(id)
    return module ? [{ id: module.id, name: module.name, version: versions[module.moduleId] ?? module.version }] : []
  })
}

/** The one-click hardware report keeps the unit, OS and full downloaded build context. */
export function hardwareReportBody(machine: string, os: string, module: BuiltModule, build: readonly BuiltModule[]) {
  const others = build.filter(item => item.id !== module.id)
  const summary = '**Works on my ' + machine + '**' + (os ? ' (OS ' + os + ')' : '') + ' · ' + module.name + ' ' + module.version
    + (others.length ? ', built together with ' + others.map(item => item.name + ' ' + item.version).join(', ') : '') + '.'
  return summary
}
