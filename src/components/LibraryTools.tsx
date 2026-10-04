import { Icon } from './Icon'

export type LibraryToolsProps = {
  family: string
  families: string[]
  onFamilyChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  comparisonCount: number
  onCompare: () => void
  buildHref?: string | null
  buildLabel?: string
}

export function LibraryTools({ family, families, onFamilyChange, sort, onSortChange, comparisonCount, onCompare, buildHref = '#configuration', buildLabel }: LibraryToolsProps) {
  return <div className="discovery-tools">
    <label>Type<select value={family} onChange={event=>onFamilyChange(event.target.value)}><option value="all">All types</option>{families.map(value=><option key={value}>{value}</option>)}</select></label>
    <label>Sort<select value={sort} onChange={event=>onSortChange(event.target.value)}><option value="collection">Collection order</option><option value="recent">Recently added</option><option value="name">Name A–Z</option><option value="author">Author</option><option value="rated">Highest rated</option><option value="liked">Most liked</option><option value="downloaded">Most downloaded</option></select></label>
    <div className="discovery-actions">
      <button className="button button-quiet" disabled={comparisonCount<2} onClick={onCompare}>Compare{comparisonCount?' ('+comparisonCount+')':''}</button>
      {buildHref && <a className="button button-primary" href={buildHref} aria-label={buildLabel} title={buildLabel}><Icon name="sliders" size={16}/>Build firmware</a>}
    </div>
  </div>
}
