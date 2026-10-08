import { useEffect } from 'react'
import type { catalogNeighbors } from '../catalog/catalog-browse'
import { Icon } from './Icon'

type Navigation = NonNullable<ReturnType<typeof catalogNeighbors>>

export function CatalogNavigation({ navigation }: { navigation: Navigation }) {
  const { previous, next } = navigation
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || !window.matchMedia('(min-width: 1101px)').matches || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
      // Inputs, tab lists, menus, media and dialogs keep their own arrow-key behavior.
      if (event.target instanceof Element && event.target.closest('input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="tablist"], [role="textbox"], [role="slider"], [role="listbox"], [role="menu"], audio, video')) return
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return
      const link = document.getElementById(event.key === 'ArrowLeft' ? 'catalog-previous' : 'catalog-next')
      if (link) { event.preventDefault(); link.click() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  return <nav className="catalog-navigation" aria-label="Browse catalog results">
    {previous ? <a id="catalog-previous" className="catalog-chevron is-previous" href={previous.href} rel="prev" aria-label={'Previous module: ' + previous.name} aria-keyshortcuts="ArrowLeft" title={'Previous: ' + previous.name + ' (←)'}><Icon name="back" size={24} /></a>
      : <button className="catalog-chevron is-previous" type="button" disabled aria-label="No previous module"><Icon name="back" size={24} /></button>}
    {next ? <a id="catalog-next" className="catalog-chevron is-next" href={next.href} rel="next" aria-label={'Next module: ' + next.name} aria-keyshortcuts="ArrowRight" title={'Next: ' + next.name + ' (→)'}><Icon name="back" size={24} /></a>
      : <button className="catalog-chevron is-next" type="button" disabled aria-label="No next module"><Icon name="back" size={24} /></button>}
  </nav>
}
