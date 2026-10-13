import type { BuiltModule } from '../community/build-follow-up'
import { downloadedModuleGuide } from '../community/downloaded-module-guide'

/** Share the same short, version-matched first test across module pages and downloads. */
export function ModuleUsageInstructions({ module, title = 'Quick tutorial', steps }: { module: BuiltModule; title?: string; steps: readonly string[] }) {
  const guide = downloadedModuleGuide(module)
  if (!guide?.hasQuickTest) return <><h3>{title}</h3><ol className="usage-list">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol></>
  return <>
    <h3>Quick test</h3>
    <ol className="usage-list module-quick-test">{guide.steps.map((step, index) => <li key={index}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol>
    <details className="module-full-instructions"><summary>Full instructions &amp; more controls</summary><ol className="usage-list">{steps.map((step, index) => <li key={index}>{step}</li>)}</ol></details>
  </>
}
