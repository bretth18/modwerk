/** Metadata only. Bundled modules are context; testedModuleIds are explicit confirmations. */
export type WorkingReportBuild = { machine: string; os: string; modules: readonly { id: string; name: string; version: string }[] }
