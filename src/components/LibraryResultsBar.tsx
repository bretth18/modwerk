import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { DEFAULT_MODULE_SORT, MODULE_SORTS } from '../community/module-statistics'
import { useSheetScrollLock } from '../hooks/useSheetScrollLock'

type SheetOption = { value: string; label: string; count?: number }

export type LibraryResultsBarProps = {
  summary: string
  sort: string
  onSortChange: (value: string) => void
  family: string
  onFamilyChange: (value: string) => void
  // The types present in the current view, each counted as if it were chosen.
  families: readonly { value: string; count: number }[]
  allCount: number
  disabled?: boolean
}

// Phones: the line under the category chips. It sticks with them, so sort and type stay in reach while scrolling;
// each opens a bottom sheet that applies the choice and closes.
export function LibraryResultsBar({ summary, sort, onSortChange, family, onFamilyChange, families, allCount, disabled = false }: LibraryResultsBarProps) {
  const [open, setOpen] = useState<'sort' | 'type' | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const sheetId = useId()
  const sortOption = MODULE_SORTS.find(option => option.value === sort) ?? MODULE_SORTS[0]
  const close = useCallback(() => { setOpen(null); trigger.current?.focus() }, [])
  function show(sheet: 'sort' | 'type', button: HTMLButtonElement) { trigger.current = button; setOpen(sheet) }
  const typeOptions: SheetOption[] = [{ value: 'all', label: 'All types', count: allCount }, ...families.map(option => ({ value: option.value, label: option.value, count: option.count }))]
  return <div className="library-results-bar">
    <span className="library-results-summary" aria-live="polite">{summary}</span>
    {!disabled && <>
      <button type="button" className={'library-results-button' + (sort !== DEFAULT_MODULE_SORT ? ' is-set' : '')} aria-label={'Sort: ' + sortOption.label} aria-haspopup="dialog" aria-expanded={open === 'sort'} aria-controls={open === 'sort' ? sheetId : undefined} onClick={event => show('sort', event.currentTarget)}><Icon name="sort" size={15} /><span>{sortOption.short}</span></button>
      <button type="button" className={'library-results-button' + (family !== 'all' ? ' is-set' : '')} aria-label={'Type: ' + (family === 'all' ? 'all types' : family)} aria-haspopup="dialog" aria-expanded={open === 'type'} aria-controls={open === 'type' ? sheetId : undefined} onClick={event => show('type', event.currentTarget)}><Icon name="filter" size={15} /><span>{family === 'all' ? 'Type' : family}</span></button>
    </>}
    {open && <OptionSheet id={sheetId} title={open === 'sort' ? 'Sort by' : 'Type'} options={open === 'sort' ? MODULE_SORTS : typeOptions} value={open === 'sort' ? sort : family} onClose={close}
      onChoose={value => { if (open === 'sort') onSortChange(value); else onFamilyChange(value); close() }} />}
  </div>
}

function OptionSheet({ id, title, options, value, onChoose, onClose }: { id: string; title: string; options: readonly SheetOption[]; value: string; onChoose: (value: string) => void; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useSheetScrollLock(true)
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onClose)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onClose) }
  }, [onClose])
  function moveFocus(event: ReactKeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const buttons = Array.from(panel.current?.querySelectorAll<HTMLElement>('.library-sheet-options button') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLElement)
    buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus()
    event.preventDefault()
  }
  return createPortal(<>
    {/* A tap on the scrim closes the sheet without reaching the page behind it. */}
    <div className="sheet-scrim" aria-hidden="true" onClick={onClose} />
    <div ref={panel} id={id} className="library-filter-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={moveFocus}>
      <div className="sheet-head"><span className="sheet-handle" aria-hidden="true" /><strong id={titleId}>{title}</strong><button type="button" className="sheet-close" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button></div>
      <div className="library-sheet-options">
        {options.map(option => <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChoose(option.value)}>
          <span>{option.label}</span>
          {option.count !== undefined && <small>{option.count}</small>}
          {option.value === value && <Icon name="check" size={16} />}
        </button>)}
      </div>
    </div>
  </>, document.body)
}
