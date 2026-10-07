import { useEffect, useRef, useState } from 'react'
import { configurationDevice, type Configuration } from '../config/workspace'
import { DEVICES, DEVICES_BY_ID } from '../devices/registry'
import { Icon } from './Icon'
import { useSheetScrollLock } from '../hooks/useSheetScrollLock'

export function ConfigurationBrowser({ configurations, activeId, currentDevice, onSelect, onCreate, onClose }: { configurations: Configuration[]; activeId?: string; currentDevice: string; onSelect: (id: string) => void; onCreate: (device: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [machine, setMachine] = useState('all')
  useSheetScrollLock(true)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const panel = dialog.current
    panel?.showModal(); search.current?.focus()
    return () => { panel?.close(); previous?.focus() }
  }, [])
  const term = query.trim().toLowerCase()
  const machines = DEVICES.filter(device => device.status === 'available' || device.status === 'preview' || configurations.some(item => configurationDevice(item) === device.id))
  const items = configurations.filter(item => (machine === 'all' || configurationDevice(item) === machine) && (item.name + ' ' + DEVICES_BY_ID[configurationDevice(item)].name).toLowerCase().includes(term))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name))
  const createDevice = DEVICES_BY_ID[machine === 'all' ? currentDevice : machine]
  const canCreate = createDevice.status === 'available' || createDevice.status === 'preview'
  return <dialog ref={dialog} className={'app-dialog configuration-browser' + (configurations.length > 6 ? ' is-scrollable' : '')} aria-labelledby="configuration-browser-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="configuration-browser-heading"><h2 id="configuration-browser-title">Configurations <span className="subtle">{configurations.length}</span></h2><button type="button" className="icon-button" aria-label="Close configurations" onClick={onClose}><Icon name="close" size={18} /></button></div>
    <div className="configuration-browser-tools"><label className="configuration-search"><Icon name="search" size={16} /><span className="sr-only">Search configurations</span><input ref={search} type="search" placeholder="Search configurations" value={query} onChange={event => setQuery(event.target.value)} /></label><label><span className="sr-only">Filter configurations by machine</span><select value={machine} onChange={event => setMachine(event.target.value)}><option value="all">All machines</option>{machines.map(device => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label></div>
    <div className="configuration-browser-list"><ul aria-label="Saved configurations">{items.map(item => {
      const device = DEVICES_BY_ID[configurationDevice(item)], active = item.id === activeId
      return <li key={item.id}><button type="button" aria-current={active || undefined} onClick={() => { onSelect(item.id); onClose() }}><Icon name="file" size={18} /><span><strong>{item.name}</strong><small>{device.name} · {item.moduleIds.length} {item.moduleIds.length === 1 ? 'module' : 'modules'}</small></span>{active && <span className="configuration-current"><Icon name="check" size={14} />Current</span>}<Icon name="arrow" size={15} /></button></li>
    })}</ul>{!items.length && <div className="configuration-browser-empty"><strong>{configurations.length ? 'No configurations found' : 'No saved configurations yet'}</strong><p>{configurations.length ? 'Try another name or machine.' : 'Create one to start choosing modules.'}</p></div>}</div>
    <div className="configuration-browser-footer"><span>{items.length} {items.length === 1 ? 'configuration' : 'configurations'}</span><button type="button" className="button button-quiet" disabled={!canCreate} onClick={() => { onClose(); onCreate(createDevice.id) }}><Icon name="plus" size={16} />New {createDevice.name} configuration</button></div>
  </dialog>
}
