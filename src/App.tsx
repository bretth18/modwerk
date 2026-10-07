import { AccountPage } from './community/AccountPage'
import { NotificationBell } from './community/NotificationBell'
import { useMembersOnline } from './community/useMembersOnline'
import { DeveloperPage } from './community/DeveloperPage'
import { MemberGate } from './community/MemberGate'
import { ForumPage } from './community/ForumPage'
import { ForumShoutbox } from './community/ForumShoutbox'
import './community/forum.css'
import { trackPageView, trackUsage } from './community/usage'
import { LegalPage } from './legal/LegalPage'
import { PrivacyPage } from './community/PrivacyPage'
import { INDEPENDENCE_NOTICE, FLASHING_RISKS, FIRMWARE_SHARING_NOTICE } from './firmware-notices'
import { assetUrl } from './hosting'
import { getRoute, moduleHref } from './routing'
import { ModuleSets } from './components/ModuleSets'
import { ModuleComparison } from './components/ModuleComparison'
import { api } from './community/api'
import { compareModules, downloadCoverage, type ModuleStatistics } from './community/module-statistics'
import { ModulePopularity } from './community/ModulePopularity'
import { selectionConflicts, type ConflictFix } from './catalog/selection-conflicts'
import { CompatibilityPanel } from './components/CompatibilityPanel'
import { SelectionWarning } from './components/SelectionWarning'
import { useCommunity } from './community/context'
import { SubmissionPage } from './community/SubmissionPage'
import { AdminPage } from './community/AdminPage'
import { PublishedModulePage } from './community/PublishedModulePage'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { flushSync } from 'react-dom'
import { LIBRARY_CATEGORIES, LIBRARY_CATEGORY_LABELS, MODULES, STANDALONE_NOTE, resolveSelection, type ModuleCategory } from './catalog/modules'
import { AVAILABLE_MODULES, isModulePaused, moduleAvailabilityError } from './catalog/availability'
import { DETAILS } from './catalog/details'
import { ENGINE_AVAILABLE, DOWNLOADS_ENABLED, DSP_LOADER } from './engine/protocol'
import { useFirmwareBuild } from './hooks/useFirmwareBuild'
import { issueRepository, setWorkspaceReportContext } from './community/report-context'
import { FirmwareBuildPanel } from './components/FirmwareBuildPanel'
import { DIGI_DOWNLOADS_ENABLED } from './engine/elekloader/protocol'
import { downloadSelection, parseSelection } from './config/selection'
import { Icon } from './components/Icon'
import { ModulePreview } from './components/ModulePreview'
import { ModuleCard } from './components/ModuleCard'
import { LibraryTools } from './components/LibraryTools'
import { ModuleDetail } from './components/ModuleDetail'
import { useModuleUpdates } from './hooks/useModuleUpdates'
import { FaqPage } from './components/FaqPage'
import { MobileMenu } from './components/MobileMenu'
import { MachineSwitcher } from './devices/MachineSwitcher'
import { AllMachinesLibrary, DigiConfiguration, DigiLibrary, DigiModDetail, EmptyMachine } from './devices/MachinePages'
import { ALL_MACHINES, DEVICES_BY_ID, deviceHref, parseDeviceRoute, rememberDevice, rememberedDevice, type DeviceProfile } from './devices/registry'
import { DIGI_MODS, isDigiDevice, type DigiMod } from './devices/digi-mods'
import { configurationDevice, type Configuration } from './config/workspace'
import './devices/devices.css'
import { SupportButton, SupportDialog } from './components/SupportDialog'
import { PAYPAL_DONATION_URL } from './config/support'

import { useWorkspace } from './hooks/useWorkspace'
import { usePhoneToolbar } from './hooks/usePhoneToolbar'
import { ConfigurationDialog } from './components/ConfigurationDialog'
import { ConfigurationEffects } from './components/ConfigurationEffects'
function subscribeRoute(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
// Matches the phone shell breakpoint in styles.css.
const PHONE_LAYOUT = '(max-width: 600px)'
function subscribePhoneLayout(callback: () => void) {
  const media = window.matchMedia(PHONE_LAYOUT)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
function getPhoneLayout() { return window.matchMedia(PHONE_LAYOUT).matches }
const SIDEBAR_CATEGORIES = LIBRARY_CATEGORIES.filter(category => category === 'standalone' || AVAILABLE_MODULES.some(module => module.category === category) || DIGI_MODS.some(mod => mod.libraryCategory === category))
function defaultRoute() { const device=rememberedDevice(); return device?deviceHref(device).slice(1):ALL_MACHINES }
// With no route in the URL, open the remembered machine's library (or All machines on a first visit).
function getAppRoute() { return getRoute(defaultRoute()) }

export default function App() {
  const route = useSyncExternalStore(subscribeRoute, getAppRoute, () => 'library')
  const moduleRoute = route.split('?')[0]
  const phoneLayout = useSyncExternalStore(subscribePhoneLayout, getPhoneLayout, () => false)
  const online = useMembersOnline(), onlineLabel = online === 1 ? '1 member online' : online + ' members online'
  useEffect(()=>trackPageView(route),[route])
  const detailModule = moduleRoute.startsWith('module/') ? AVAILABLE_MODULES.find((module) => module.id === moduleRoute.slice(7)) : undefined
  const pausedModule = MODULES.find(module => isModulePaused(module.id) && (moduleRoute === 'module/' + module.id || moduleRoute === 'community-module/' + module.id))
  const configuration = route === 'configuration'
  const { session, developer, catalog } = useCommunity()
  const communityModule = moduleRoute.startsWith('community-module/') ? catalog.find(item => item.module_id === moduleRoute.slice(17) && !isModulePaused(item.module_id)) : undefined
  const devicesRoute = route === 'devices'
  const machineRoute = parseDeviceRoute(moduleRoute)
  const digiDevice = machineRoute && isDigiDevice(machineRoute.device.id) ? machineRoute.device as DeviceProfile & { id: DigiMod['device'] } : undefined
  const digiMod = digiDevice && machineRoute?.view === 'module' ? DIGI_MODS.find(mod => mod.device === digiDevice.id && mod.id === machineRoute.moduleId) : undefined
  const machineView = !machineRoute ? undefined : machineRoute.view === 'module' ? (digiMod ? 'module' : undefined) : machineRoute.view === 'configuration' ? (digiDevice ? 'configuration' : undefined) : !machineRoute.category || LIBRARY_CATEGORIES.includes(machineRoute.category as ModuleCategory) ? 'library' : undefined
  const forumRoute = route === 'forum' || route.startsWith('forum/') || route.startsWith('forum?')
  const developerRoute = route === 'developer' || route.startsWith('developer/')
  const accountRoute = route === 'account' || route.startsWith('account/')
  useEffect(()=>{if(developerRoute&&!route.startsWith('developer/complete')&&developer&&!developer.user)window.location.replace('#account/developer')},[developerRoute,route,developer])
  const communityRoute = developerRoute || forumRoute || accountRoute || route === 'review' || route === 'admin' || route.startsWith('submit') || !!communityModule
  const allCategory = route.startsWith(ALL_MACHINES + '/') && LIBRARY_CATEGORIES.includes(route.slice(4) as ModuleCategory) ? route.slice(4) as ModuleCategory : undefined
  const allRoute = route === ALL_MACHINES || !!allCategory
  const missingRoute=!allRoute&&!devicesRoute&&!machineView&&route!=='octatrack'&&!route.startsWith('device/')&&!forumRoute&&!accountRoute&&!developerRoute&&!['library',...LIBRARY_CATEGORIES,'module-sets','configuration','faq','review','admin','privacy','impressum','community-rules','report-content'].includes(route)&&!route.startsWith('submit')&&!detailModule&&!communityModule&&!route.startsWith('module-set/')
  const filter = LIBRARY_CATEGORIES.find(category => category === route) ?? 'all'
  const octatrackRoute = route === 'library' || route === 'configuration' || route === 'module-sets' || route.startsWith('module') || LIBRARY_CATEGORIES.includes(route as typeof LIBRARY_CATEGORIES[number])
  // The selected machine follows library routes and is remembered for the rest of the app.
  const remembered = rememberedDevice()
  // All machines is a library view; machine-specific panels fall back to the last machine (or the Octatrack).
  const allMachines = allRoute || (!machineView && !octatrackRoute && remembered === ALL_MACHINES)
  const currentDevice = DEVICES_BY_ID[machineView ? machineRoute!.device.id : octatrackRoute ? 'octatrack' : remembered && remembered !== ALL_MACHINES ? remembered : 'octatrack']
  const machineHasMods = !allMachines && (currentDevice.status === 'available' || currentDevice.status === 'preview')
  useEffect(() => { if (allRoute) rememberDevice(ALL_MACHINES); else if (machineView || octatrackRoute) rememberDevice(currentDevice.id) }, [allRoute, machineView, octatrackRoute, currentDevice.id])
  // The machine overview now lives on the forum's front page.
  useEffect(() => { if (devicesRoute) window.location.replace('#forum'); else if (route === 'octatrack') window.location.replace('#library'); else if (route.startsWith('device/')) window.location.replace(DEVICES_BY_ID[route.slice(7)] ? deviceHref(route.slice(7)) : '#devices') }, [route, devicesRoute])
  // The sidebar keeps one shape on every machine: the same categories, counted for the current selection.
  const libraryCount = (category?: ModuleCategory) => (allMachines || currentDevice.id === 'octatrack' ? AVAILABLE_MODULES.filter(module => !category || module.category === category).length : 0) + DIGI_MODS.filter(mod => (allMachines || mod.device === currentDevice.id) && (!category || mod.libraryCategory === category)).length
  const libraryHref = (category?: ModuleCategory) => allMachines ? '#' + ALL_MACHINES + (category ? '/' + category : '') : currentDevice.id === 'octatrack' ? '#' + (category ?? 'library') : deviceHref(currentDevice.id, category ?? '')
  const libraryCategory = allMachines ? allCategory : currentDevice.id === 'octatrack' ? (detailModule || filter === 'all' ? undefined : filter) : machineRoute?.category
  const onLibrary = allMachines ? allRoute : currentDevice.id === 'octatrack' ? route === 'library' || LIBRARY_CATEGORIES.includes(route as ModuleCategory) : machineView === 'library'
  const machineCounts: Record<string, number> = { octatrack: AVAILABLE_MODULES.length, ...Object.fromEntries(['digitakt', 'digitone'].map(id => [id, DIGI_MODS.filter(mod => mod.device === id).length])) }
  const categoryLabels = { effects:'Effects', playback:'Playback', machines:'Machines & sequencer', scenes:'Scenes', 'midi-usb':'MIDI & USB', system:'System', standalone:'Standalone firmware' }
  const workspace = useWorkspace()
  const { active: storedActive, ready, firmware, fileState, fileError, firmwareSaved, readFile, clearFile } = workspace
  // Each machine shows its own configurations; the Octatrack code below always works on an Octatrack configuration.
  const configurationsFor = (device: string) => workspace.configurations.filter(item => configurationDevice(item) === device)
  const activeFor = (device: string) => storedActive && configurationDevice(storedActive) === device ? storedActive : configurationsFor(device).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  const active = activeFor('octatrack')
  const machineActive = activeFor(currentDevice.id)
  const machineConfigurations = configurationsFor(currentDevice.id)
  const machineSelected = machineActive?.moduleIds ?? []
  function ensureActive(item?: Configuration) { if (item && storedActive?.id !== item.id) workspace.selectConfiguration(item.id) }
  function setKeepStockFx2(value: boolean) { ensureActive(active); workspace.setKeepStockFx2(value) }
  function toggleMachineModule(id: string) { workspace.toggleModule(id, currentDevice.id) }
  const selectedIds = active?.moduleIds ?? []
  const firmwareBuild = useFirmwareBuild(workspace.firmwareClient, active, firmware)
  const builtSha = firmwareBuild.state === 'built' ? firmwareBuild.result?.sha256 ?? '' : ''
  useEffect(() => {
    // Issue reports name the active configuration or another one saved here and, once built here, the image hash (never the image).
    const configurationsFor = (device: string) => workspace.configurations.filter(item => configurationDevice(item) === device)
    const activeFor = (device: string) => storedActive && configurationDevice(storedActive) === device ? storedActive : configurationsFor(device).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    const modulesOf = (item?: Configuration) => (item?.moduleIds ?? []).map(id => ({ id, version: item?.moduleVersions[id] ?? '' })).filter(value => value.version)
    const keepStockFx2 = (item?: Configuration) => DSP_LOADER ? item?.keepStockFx2 ?? true : null
    setWorkspaceReportContext({ configurationName: active?.name ?? '', modules: modulesOf(active), keepStockFx2: keepStockFx2(active), build: builtSha, activeId: active?.id ?? '', configurations: configurationsFor('octatrack').map(item => ({ id: item.id, name: item.name, modules: modulesOf(item), keepStockFx2: keepStockFx2(item) })) })
    for (const device of ['digitakt','digitone']) {
      const item = activeFor(device)
      setWorkspaceReportContext({ configurationName: item?.name ?? '', modules: modulesOf(item), keepStockFx2: null, build: '', activeId: item?.id ?? '', configurations: configurationsFor(device).map(value => ({ id: value.id, name: value.name, modules: modulesOf(value), keepStockFx2: null })) }, device)
    }
  }, [active, builtSha, storedActive, workspace.configurations])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchToggleRef = useRef<HTMLButtonElement>(null)
  const searchExpanded = searchOpen || query !== ''
  // Phones show search as an icon; open it within the tap so the keyboard appears.
  function openSearch() { flushSync(() => setSearchOpen(true)); searchRef.current?.focus() }
  function closeSearch() { setQuery(''); flushSync(() => setSearchOpen(false)); searchToggleRef.current?.focus() }
  const [family,setFamily]=useState('all'),[sort,setSort]=useState('collection'),[comparison,setComparison]=useState<string[]>([]),[compareOpen,setCompareOpen]=useState(false)
  const [statistics,setStatistics]=useState<ModuleStatistics[]|null>(null)
  useEffect(()=>{let cancelled=false;if(session.available)void api<ModuleStatistics[]>('/community/summary').then(value=>{if(!cancelled)setStatistics(value)}).catch(()=>{if(!cancelled)setStatistics(null)});return()=>{cancelled=true}},[session.available,route])
  const [dragging, setDragging] = useState(false)
  const [saved, setSaved] = useState(false)
  const [riskAccepted, setRiskAccepted] = useState<{key:string;accepted:boolean}>({key:'',accepted:false})
  const [importError,setImportError]=useState('')
  const importRef=useRef<HTMLInputElement>(null)
  const [configDialog, setConfigDialog] = useState<'create' | 'rename' | 'duplicate' | 'delete' | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLElement>(null)
  const toolbarHidden = usePhoneToolbar(phoneLayout, toolbarRef, route)
  const libraryNavRef = useRef<HTMLElement>(null)
  // On phones the library nav is a horizontal strip; keep the current section in view.
  useEffect(() => {
    const active = libraryNavRef.current?.querySelector('.active')
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    else libraryNavRef.current?.scrollTo({ left: 0 })
  }, [route])
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 });window.scrollTo({ top: 0 });document.title=(detailModule?.name??digiMod?.title??(allRoute?'All mods':machineView==='configuration'?currentDevice.name+' configuration':machineView?currentDevice.name+' modules':forumRoute?'Forum':accountRoute?'Account':developerRoute?(developer?.user&&!route.startsWith('developer/complete')?'Developer workspace':'Account'):route==='faq'?'FAQ':route==='privacy'?'Privacy':route==='impressum'?'Impressum':route==='community-rules'?'Community rules':route==='report-content'?'Report content':route==='configuration'?'Configuration':route.startsWith('submit')?'Submit a module':(route==='review'||route==='admin')?'Admin workspace':route.startsWith('module-set')?'Module sets':'Module library'))+' · Modwerk' }, [route,detailModule?.name,forumRoute,accountRoute,developerRoute,developer?.user,devicesRoute,allRoute,digiMod?.title,machineView,currentDevice.name])
  const selection = resolveSelection(selectedIds)
  const availabilityError = moduleAvailabilityError(selectedIds)
  const conflicts = selectionConflicts(selectedIds, DSP_LOADER && (active?.keepStockFx2 ?? true))
  const libraryFilter = allRoute ? allCategory ?? 'all' : filter
  const libraryFamily = allRoute || AVAILABLE_MODULES.some(module=>DETAILS[module.id].family===family) ? family : 'all'
  const visibleModules = AVAILABLE_MODULES.filter((module) =>
    (libraryFilter === 'all' || module.category === libraryFilter)
    && (libraryFamily==='all'||DETAILS[module.id].family===libraryFamily)
    && (module.name + ' ' + module.description + ' ' + module.authorName + ' ' + module.author).toLowerCase().includes(query.toLowerCase().trim()),
  ).sort((a,b)=>compareModules(a,b,sort,statistics))
  const displayedModules = detailModule ? [detailModule] : allRoute || route === 'library' || LIBRARY_CATEGORIES.includes(route as typeof LIBRARY_CATEGORIES[number]) ? visibleModules : []
  const { viewed: viewedModuleVersions, baseline: moduleBaseline } = useModuleUpdates(displayedModules, MODULES, detailModule?.id)

  function toggleComparison(id: string) { setComparison(current=>current.includes(id)?current.filter(value=>value!==id):current.length<3?[...current,id]:current) }
  function toggleModule(id: string) { workspace.toggleModule(id); setSaved(false); setRiskAccepted({key:'',accepted:false}) }
  function fixConflict(fix: ConflictFix) {
    for (const id of fix.removeIds ?? []) if (selectedIds.includes(id)) workspace.toggleModule(id)
    if (fix.keepStockFx2 !== undefined) setKeepStockFx2(fix.keepStockFx2)
    setSaved(false); setRiskAccepted({key:'',accepted:false})
  }
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) void readFile(file)
  }
  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false)
    if (event.dataTransfer.files.length !== 1) { workspace.setFileError('Choose one firmware file at a time.'); return }
    void readFile(event.dataTransfer.files[0])
  }
  function saveSelection() { downloadSelection(selectedIds, firmware, active?.name, DSP_LOADER && (active?.keepStockFx2 ?? true), active?.moduleVersions); setSaved(true); trackUsage('configuration_exported') }
  async function importSelection(event: ChangeEvent<HTMLInputElement>) {
    const file=event.currentTarget.files?.[0]; event.currentTarget.value=''; if(!file)return
    setImportError('')
    try {
      if(file.size>32*1024)throw new Error('Configuration backups must be smaller than 32 KB.')
      const imported=parseSelection(await file.text())
      workspace.importConfiguration(imported.name,imported.moduleIds,imported.keepStockFx2,imported.moduleVersions)
      setSaved(false);setRiskAccepted({key:'',accepted:false});window.location.assign('#configuration')
    }catch(error){setImportError(error instanceof Error?error.message:'Could not import this configuration.')}
  }
  function changeConfiguration(id: string) { const item = workspace.configurations.find(value => value.id === id); workspace.selectConfiguration(id); setSaved(false); setRiskAccepted({key:'',accepted:false}); window.location.assign(deviceHref(item ? configurationDevice(item) : currentDevice.id, 'configuration')) }
  function submitConfigurationDialog(name: string) {
    ensureActive(machineActive)
    if (configDialog === 'delete') workspace.deleteConfiguration()
    else if (configDialog === 'rename') workspace.renameConfiguration(name)
    else workspace.createConfiguration(name, configDialog === 'duplicate', currentDevice.id)
    setSaved(false); setRiskAccepted({key:'',accepted:false}); window.location.assign(deviceHref(currentDevice.id, 'configuration'))
  }

  // Routes that browse a library: they get the search field and, on phones, the category chips under the app bar.
  const libraryNav = ['library', ...LIBRARY_CATEGORIES, 'module-sets'].includes(route) || allRoute || (digiDevice && machineView === 'library')
  const firmwareVerified = !allMachines && currentDevice.id === 'octatrack' && !!firmware
  const machineStatus = allMachines ? 'All machines' : currentDevice.id !== 'octatrack' ? currentDevice.name + (machineHasMods ? DIGI_DOWNLOADS_ENABLED ? ' · local builds' : ' · builds in preview' : ' · no mods yet') : firmware ? 'OS 1.40C verified' : 'No base firmware selected'
  const saveStatus = workspace.saving ? "Saving…" : workspace.storageError ? "Changes not saved" : "Workspace saved on device"
  const legalLinks = <nav className="legal-links" aria-label="Legal information"><a href="#privacy">Privacy</a><a href="#impressum">Impressum</a><a href="#report-content">Report content</a></nav>
  // Phones show the independence notice in the page footer; wider layouts keep it above the content.
  const projectNotice = <aside className="project-notice" aria-label="Project independence"><p>{INDEPENDENCE_NOTICE}</p><a href={assetUrl('licenses/THIRD_PARTY_NOTICES.html')} target="_blank" rel="noreferrer">Copyright &amp; licence notices</a></aside>

  return (
    <div className={'app-shell' + (phoneLayout ? (libraryNav ? ' has-library-nav' : '') + (toolbarHidden ? ' is-toolbar-hidden' : '') : '')}>
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus() }}>Skip to content</a>
      <aside className="sidebar" aria-label="App sidebar">
        <div className="sidebar-brand">
          <a className="app-brand" href={'#' + ALL_MACHINES}><img src={import.meta.env.BASE_URL + 'modwerk-mark.svg'} width="34" height="34" alt="" /><span>Modwerk</span><small>Custom Elektron firmware</small></a>
          {!phoneLayout && <NotificationBell />}
        </div>
        {!phoneLayout && <MachineSwitcher current={currentDevice} all={allMachines} counts={machineCounts} />}
        <div className="sidebar-section-label">Library</div>
        <nav className="sidebar-nav" aria-label="Module library" ref={libraryNavRef}>
          {phoneLayout ? <MachineSwitcher compact current={currentDevice} all={allMachines} counts={machineCounts} active={onLibrary && !libraryCategory} /> : <a href={libraryHref()} className={onLibrary && !libraryCategory ? 'active' : ''} aria-current={onLibrary && !libraryCategory ? 'page' : undefined}><Icon name="grid" /><span>All modules</span><small>{libraryCount()}</small></a>}
          {SIDEBAR_CATEGORIES.map(category => {
            const count = libraryCount(category), current = onLibrary && libraryCategory === category
            return <a key={category} href={libraryHref(category)} onClick={()=>setFamily('all')} className={(current ? 'active' : '') + (count ? '' : ' is-empty') + (category === 'standalone' ? ' sidebar-standalone' : '')} aria-current={current ? 'page' : undefined}><Icon name={category==='standalone'?'lock':category==='scenes'?'grid':category==='effects'||category==='midi-usb'?'wave':'sliders'} /><span>{LIBRARY_CATEGORY_LABELS[category]}</span><small>{count}</small></a>
          })}
          <a href="#module-sets" className={route.startsWith('module-set')?'active':''}><Icon name="file"/><span>Module sets</span></a>
        </nav>
        <div className="sidebar-section-label configuration-label"><span>Configurations</span><button className="icon-button" aria-label={machineHasMods ? 'New ' + currentDevice.name + ' configuration' : 'New configuration'} title={machineHasMods ? undefined : allMachines ? 'Choose a machine to create a configuration' : 'This machine has no mods yet'} disabled={!ready || !machineHasMods} onClick={() => setConfigDialog("create")}><Icon name="plus" size={18} /></button></div>
        <nav className="sidebar-nav configuration-nav" aria-label="Saved configurations">{(allMachines ? workspace.configurations : machineConfigurations).map(item => { const selected = item.id === (allMachines ? storedActive?.id : machineActive?.id); return <button key={item.id} className={selected ? 'active' : ''} aria-pressed={selected} title={allMachines ? DEVICES_BY_ID[configurationDevice(item)]?.name : undefined} onClick={() => changeConfiguration(item.id)}><Icon name="file" /><span>{item.name}</span><small>{item.moduleIds.length}</small></button> })}{!allMachines && !machineHasMods && <p className="sidebar-empty-note">No mods to configure yet.</p>}</nav>
        <div className="sidebar-section-label community-label">Community & help</div><nav className="sidebar-nav community-nav" aria-label="Community and help"><a href="#forum" className={forumRoute?'active':''}><Icon name="message"/><span>Forum</span>{online ? <span className="sidebar-online" title={onlineLabel}><span className="online-dot" aria-hidden="true"/>{online} online</span> : <span className="sidebar-feature-new">New</span>}</a><a href="#account" className={accountRoute?'active':''}><Icon name="shield"/><span>{session.user?.verified?'Your account':'Sign in / register'}</span></a>{developer?.user&&<a href="#developer" className={developerRoute?'active':''}><Icon name="sliders"/><span>Developer workspace</span></a>}<a href="#submit" className={route.startsWith('submit') ? 'active' : ''}><Icon name="plus"/><span>Submit a module</span></a>{session.admin && <a href="#admin" className={route === 'admin'||route === 'review' ? 'active' : ''}><Icon name="shield"/><span>Admin workspace</span></a>}<a href="#faq" className={route === 'faq' ? 'active' : ''} aria-current={route === 'faq' ? 'page' : undefined}><Icon name="help" /><span>FAQ<span className="help-guide-label"> & flashing guide</span></span></a></nav>
        <div className="sidebar-spacer" />
        {allMachines ? <div className="sidebar-build"><span className="status-dot" /><span className="sidebar-build-copy"><strong>Builds are per machine</strong><small>Choose a machine above to build its firmware.</small></span></div> : currentDevice.id === 'octatrack' ? <a className="sidebar-build" href="#configuration" aria-label={firmware ? 'Base firmware ready — View configuration' : undefined} aria-describedby={firmware ? 'sidebar-firmware-status' : undefined}>
          <span className={'status-dot ' + (firmware ? 'verified' : '')} />
          <span className="sidebar-build-copy"><strong>{firmware ? 'Base firmware ready' : 'Choose firmware'}</strong><small id="sidebar-firmware-status">{firmware ? 'OS 1.40C · ' + (firmwareSaved ? 'saved on device' : 'this session') : 'Start with your own OS 1.40C file.'}</small></span>
          <Icon name="arrow" size={14} />
        </a> : machineHasMods ? <a className="sidebar-build" href={deviceHref(currentDevice.id, 'configuration')}><span className="status-dot preview" /><span className="sidebar-build-copy"><strong>Build in your browser</strong><small>{DIGI_DOWNLOADS_ENABLED ? <>Check, build and download {currentDevice.name} firmware locally.</> : <>Check and build {currentDevice.name} firmware. Downloads after review.</>}</small></span><Icon name="arrow" size={14} /></a> : <a className="sidebar-build" href={issueRepository() + '/blob/main/docs/ADD_A_MACHINE.md'} target="_blank" rel="noreferrer"><span className="status-dot" /><span className="sidebar-build-copy"><strong>No mods yet</strong><small>Help start the first {currentDevice.name} mod.</small></span><Icon name="arrow" size={14} /></a>}
        <div className="sidebar-footer"><div className="sidebar-privacy"><Icon name="shield" size={14} /><span>Firmware stays on your device</span></div>{PAYPAL_DONATION_URL && <SupportButton onClick={() => setSupportOpen(true)} />}</div>
      </aside>
      {compareOpen&&<ModuleComparison ids={comparison} selected={selectedIds} onToggle={toggleModule} digiSelected={{digitakt:activeFor('digitakt')?.moduleIds??[],digitone:activeFor('digitone')?.moduleIds??[]}} onToggleDigi={(device,id)=>workspace.toggleModule(id,device)} onClose={()=>setCompareOpen(false)}/>}
      {configDialog && <ConfigurationDialog mode={configDialog} initialName={configDialog === 'create' ? '' : configDialog === 'duplicate' ? (machineActive?.name ?? '') + ' copy' : machineActive?.name ?? ''} onSubmit={submitConfigurationDialog} onClose={() => setConfigDialog(null)} />}
      {supportOpen && <SupportDialog url={PAYPAL_DONATION_URL} onClose={() => setSupportOpen(false)} />}
      <div className="workspace">
        <header className="app-toolbar" ref={toolbarRef}>
          <a className="toolbar-brand" href={'#' + ALL_MACHINES}><img src={import.meta.env.BASE_URL + 'modwerk-mark.svg'} width="30" height="30" alt="" /><span>Modwerk</span></a>
          <div className="toolbar-title"><Icon name={route === 'faq' ? 'help' : configuration || machineView === 'configuration' ? 'file' : 'grid'} size={17} /><span>{route === 'faq' ? 'FAQ & flashing guide' : configuration || machineView === 'configuration' ? 'Configuration' : route === 'privacy' ? 'Privacy' : route === 'impressum' ? 'Impressum' : route === 'community-rules' ? 'Community rules' : route === 'report-content' ? 'Report content' : communityRoute ? 'Community' : route.startsWith('module-set') ? 'Module sets' : 'Modules'}</span>{(detailModule?.name ?? digiMod?.title) && <><span className="breadcrumb-divider">/</span><strong>{detailModule?.name ?? digiMod?.title}</strong></>}<span className="preview-badge">Preview</span></div>
          {libraryNav && <><label className={'search' + (searchExpanded ? ' is-open' : '')}><Icon name="search" size={15} /><input ref={searchRef} type="search" aria-label={route==='module-sets'?'Search module sets':'Search modules'} placeholder={route==='module-sets'?'Search sets':'Search modules'} value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => { if (!query) setSearchOpen(false) }} onKeyDown={(event) => { if (phoneLayout && event.key === 'Escape') closeSearch() }} /></label><button ref={searchToggleRef} type="button" className="toolbar-icon search-toggle" aria-label={route==='module-sets'?'Search module sets':'Search modules'} onClick={openSearch}><Icon name="search" size={20} /></button><button type="button" className="search-cancel" onClick={closeSearch}>Cancel</button></>}
          {phoneLayout && <NotificationBell />}
          <MobileMenu route={route} online={online} selectedCount={machineSelected.length} configurationHref={machineHasMods ? deviceHref(currentDevice.id, 'configuration') : undefined} admin={session.admin} developer={!!developer?.user} onSupport={PAYPAL_DONATION_URL ? () => setSupportOpen(true) : undefined} />
          {machineHasMods && <a className={'configuration-button' + (machineSelected.length ? '' : ' is-empty')} href={deviceHref(currentDevice.id, 'configuration')} aria-label={"Open configuration, " + machineSelected.length + " modules selected"} aria-current={configuration || machineView === 'configuration' ? 'page' : undefined}><Icon name="sliders" size={16} /><span>Configuration</span><span className="toolbar-count">{machineSelected.length}</span></a>}
        </header>
        <main className="workspace-content" id="main-content" ref={mainRef} tabIndex={-1}>
          {!phoneLayout && projectNotice}
          {workspace.storageError && <div className="file-error" role="alert">{workspace.storageError} Export important configurations before closing this tab.</div>}
          {route === 'faq' ? <FaqPage /> : machineView && !digiDevice ? <EmptyMachine key={currentDevice.id} device={currentDevice} /> : !ready ? <div className="loading-panel" role="status">Opening your workspace…</div> : <>
          {allRoute ? <AllMachinesLibrary query={query} category={allCategory} octatrackModules={visibleModules} family={family} onFamilyChange={setFamily} sort={sort} onSortChange={setSort} statistics={statistics} octatrackConflicts={conflicts} comparison={comparison} onCompare={toggleComparison} onOpenComparison={()=>setCompareOpen(true)} viewedModuleVersions={viewedModuleVersions} moduleBaseline={moduleBaseline} octatrackSelected={selectedIds} onToggleOctatrack={toggleModule} digiSelected={{ digitakt: activeFor('digitakt')?.moduleIds ?? [], digitone: activeFor('digitone')?.moduleIds ?? [] }} onToggleDigi={(device, id) => workspace.toggleModule(id, device)} /> : digiDevice && machineView === 'library' ? <DigiLibrary device={digiDevice} category={machineRoute?.category} statistics={statistics} query={query} selectedIds={machineSelected} onToggle={toggleMachineModule} family={family} onFamilyChange={setFamily} sort={sort} onSortChange={setSort} comparison={comparison} onCompare={toggleComparison} onOpenComparison={()=>setCompareOpen(true)} /> : digiDevice && digiMod ? <DigiModDetail key={digiMod.device+'-'+digiMod.id} device={digiDevice} mod={digiMod} selected={machineSelected.includes(digiMod.id)} onToggle={() => toggleMachineModule(digiMod.id)} /> : digiDevice && machineView === 'configuration' ? <DigiConfiguration key={digiDevice.id} device={digiDevice} configuration={machineActive} configurations={machineConfigurations} onSelect={id => { workspace.selectConfiguration(id) }} onDialog={setConfigDialog} onToggle={toggleMachineModule} onImport={item => workspace.importConfiguration(item.name,item.moduleIds,false,item.moduleVersions,digiDevice.id)} /> : missingRoute?<div className="no-results"><h1>{pausedModule ? 'Module temporarily unavailable' : 'Page not found'}</h1><p>{pausedModule ? pausedModule.name + ' has been temporarily removed due to reported audio crackling.' : 'This module or page is not in the current catalog.'}</p><a className="button button-quiet" href="#library">Open module library</a></div>:route==='module-sets'||route.startsWith('module-set/')?<ModuleSets query={query} id={moduleRoute.startsWith('module-set/')?moduleRoute.slice(11):undefined} onUse={(name,ids)=>{workspace.importConfiguration(name,ids);window.location.assign('#configuration')}}/>:forumRoute ? <ForumPage key={route} route={route} configuration={storedActive} configurations={workspace.configurations} onCopy={config=>{const device=config.device??'octatrack';workspace.importConfiguration(config.name,config.moduleIds,config.keepStockFx2,config.moduleVersions,device);window.location.assign(deviceHref(device,'configuration'))}}/> : developerRoute ? <DeveloperPage key={route.startsWith('developer/report/')?route:route.split('/')[0]} route={route}/> : accountRoute ? <AccountPage key={route.split('/').slice(0,2).join('/')} route={route}/> : route === 'privacy' ? <PrivacyPage /> : ['impressum','community-rules','report-content'].includes(route) ? <LegalPage route={route}/> : route.startsWith('submit') ? <SubmissionPage key={route} moduleId={route.split('/')[1] ?? ''} /> : route === 'review'||route === 'admin' ? <AdminPage /> : communityModule ? <PublishedModulePage key={communityModule.module_id} module={communityModule} /> : detailModule ? <ModuleDetail key={detailModule.id} module={detailModule} selected={selectedIds.includes(detailModule.id)} onToggle={() => toggleModule(detailModule.id)} /> : configuration ? (
            <div className="configuration-page">
              <div className="page-heading"><div><p className="page-kicker">YOUR WORKSPACE</p><h1>{active?.name}</h1><p>Changes save automatically on this device. Configurations use current module versions.</p></div><span className="pill">OS 1.40C</span></div>
              <div className="configuration-actions"><select aria-label="Choose configuration" value={active?.id ?? ''} onChange={event => changeConfiguration(event.target.value)}>{workspace.configurations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button button-primary" onClick={() => setConfigDialog('create')}><Icon name="plus" size={16} />New</button><button className="button button-quiet" onClick={() => setConfigDialog('rename')}>Rename</button><button className="button button-quiet" onClick={() => setConfigDialog('duplicate')}>Duplicate</button><button className="button button-quiet" onClick={() => setConfigDialog('delete')}>Delete</button><button className="button button-quiet" onClick={()=>importRef.current?.click()}>Import JSON</button><a className="button button-quiet" href="#forum/new?category=configs">Share in forum</a></div><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={event=>void importSelection(event)} aria-label="Import configuration backup"/>{importError&&<p className="file-error" role="alert">{importError}</p>}
              <aside className="risk-note" role="note" aria-labelledby="project-compatibility-title">
                <strong id="project-compatibility-title">Start with a fresh Octatrack project</strong>
                <p>After installing a new firmware build, create and open a fresh project on your Octatrack. Back up your existing projects first.</p>
                <p>If your modules replace stock effects, older projects that use those effects are not compatible with the modified firmware. Removing stock FX2 effects can also make existing projects incompatible.</p>
              </aside>
              <input ref={inputRef} type="file" accept=".bin" onChange={chooseFile} hidden aria-label="Choose base firmware" />
              <CompatibilityPanel ids={selectedIds} keepStockFx2={DSP_LOADER && (active?.keepStockFx2??true)} buildState={firmwareBuild.state} onFix={fixConflict}/>
              <section className="configuration-section" aria-labelledby="firmware-title"><div className="section-title"><h2 id="firmware-title">Base firmware</h2><span className="subtle">Read locally</span></div>
                <div className={'firmware-drop ' + (dragging ? 'is-dragging ' : '') + (fileState === 'ready' ? 'is-verified' : '')} onDragOver={(event) => event.preventDefault()} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDrop={dropFile} aria-busy={fileState === 'reading'}>
                  <span className="file-symbol"><Icon name={firmware ? 'check' : 'file'} size={26} /></span>
                  <div className="file-copy" aria-live="polite"><strong>{firmware ? firmware.name : fileState === 'reading' ? 'Checking your firmware…' : 'Original Octatrack OS 1.40C'}</strong><span>{firmware ? 'SHA-256 verified · ' + (firmware.bytes / 1024).toFixed(0) + ' KB' : 'Drop your .bin file here, or choose it from your device.'}</span></div>
                  <button className="button button-quiet" onClick={() => inputRef.current?.click()}>{firmware ? 'Change file' : 'Choose file'}</button>
                </div>
                {fileError && <p className="file-error" role="alert">{fileError}</p>}
                <div className="file-footnote"><span>{firmware ? (firmwareSaved ? 'Saved on this device and verified again each time you return.' : 'Verified for this session. Saving on this device…') : 'Saved in this browser after verification. Never uploaded.'}</span>{(firmware || fileState === 'reading') && <button className="text-button" onClick={clearFile}>Remove from device</button>}</div>
                <p className="firmware-help"><a href="#faq">Where do I get the .bin? Read the FAQ & flashing guide <Icon name="arrow" size={14} /></a></p>
              </section>
              <section className="configuration-section" aria-labelledby="selection-title"><div className="section-title"><h2 id="selection-title">Selected modules <span className="subtle">{selection.length}</span></h2><a className="text-button" href="#library">Browse modules <Icon name="plus" size={14} /></a></div>
                {availabilityError && <p className="file-error" role="alert">{availabilityError}</p>}
                {selection.length ? <ul className="selected-list">{selection.map((module) => <li key={module.id}><a className="selected-module-link" href={moduleHref(module.id)}><ModulePreview id={module.id} compact /><span><strong>{module.name}</strong><small>{isModulePaused(module.id) ? 'Temporarily unavailable' : module.detail} · {module.authorName}</small></span></a><button className="icon-button" aria-label={'Remove ' + module.name} onClick={() => toggleModule(module.id)}><Icon name="close" size={17} /></button></li>)}</ul> : <div className="selection-empty"><Icon name="grid" size={26} /><strong>No modules selected</strong><p>Find something in the library and add it to your configuration.</p><a className="button button-quiet" href="#library">Browse modules</a></div>}
              </section>
              {DSP_LOADER && <section className="configuration-section chooser-options"><h2>Effect menus</h2><label><input type="checkbox" checked={active?.keepStockFx2??true} onChange={event=>setKeepStockFx2(event.target.checked)}/><span><strong>Keep stock FX2 effects</strong><small>Keep the original FX2 effects alongside your modules.</small></span></label></section>}
              <ConfigurationEffects ids={selectedIds} keepStockFx2={active?.keepStockFx2 ?? true} build={firmwareBuild} />
              <aside className="risk-note"><strong>Before you flash</strong><p>{FLASHING_RISKS} Back up your projects and samples, review the module test records, and keep the original OS. Flash at your own risk.</p><p>{FIRMWARE_SHARING_NOTICE}</p><label className="risk-accept"><input type="checkbox" checked={riskAccepted.key===firmwareBuild.key&&riskAccepted.accepted} onChange={event => setRiskAccepted({key:firmwareBuild.key,accepted:event.target.checked})} />I understand the risks of flashing custom firmware.</label></aside>
              <MemberGate action="build firmware" next={route}><FirmwareBuildPanel build={firmwareBuild} available={ENGINE_AVAILABLE} downloadsEnabled={DOWNLOADS_ENABLED} firmwareReady={!!firmware} moduleCount={selection.length} riskAccepted={riskAccepted.key===firmwareBuild.key&&riskAccepted.accepted} configurationName={active?.name??'Octamod configuration'} onExport={saveSelection} exported={saved}/></MemberGate>

            </div>
          ) : (
            <div className="library-page">
              <div className="page-heading"><div><p className="page-kicker">MODWERK / OCTATRACK</p><h1>{filter === 'all' ? 'Module library' : categoryLabels[filter]}</h1><p>{filter === 'standalone' ? STANDALONE_NOTE : 'A different way to play your Octatrack.'}</p></div><span className="library-total">{visibleModules.length} modules</span></div>
              {!!conflicts.length && <SelectionWarning warnings={[{id: 'octatrack', title: 'Octatrack: your selection needs a change', description: 'Some modules cannot run together. Choose a compatible set in your configuration.', href: '#configuration'}]} />}
              <div className="library-subheading"><span>{query.trim() ? 'Results for “' + query.trim() + '”' : filter === 'all' ? 'Explore the collection' : filter === 'effects' ? 'Filters, texture & space' : 'New ways to play'}</span><span className="subtle">Octatrack · OS 1.40C</span></div>
              <LibraryTools family={libraryFamily} families={Array.from(new Set(AVAILABLE_MODULES.map(module=>DETAILS[module.id].family)))} onFamilyChange={setFamily} sort={sort} onSortChange={setSort} comparisonCount={comparison.length} onCompare={()=>setCompareOpen(true)} />
              <div className="module-grid">{visibleModules.map((module) => {
                const selected = selectedIds.includes(module.id)
                return <ModuleCard key={module.id} module={module} selected={selected} statistics={statistics?.find(item=>item.module_id===module.id)} viewedVersion={viewedModuleVersions[module.id]} baseline={moduleBaseline} compared={comparison.includes(module.id)} canCompare={comparison.length<3||comparison.includes(module.id)} onToggle={()=>toggleModule(module.id)} onCompare={()=>toggleComparison(module.id)} />
              })}</div>
              <p className="popularity-note">{statistics ? downloadCoverage(statistics[0]?.downloadsStarted) : 'Popularity counts are currently unavailable.'}</p>
              {!visibleModules.length && <div className="no-results"><Icon name="search" size={30} /><h2>No modules found</h2><p>Try another name, effect or author.</p><button className="button button-quiet" onClick={() => {setQuery('');setFamily('all')}}>Clear search</button></div>}
              {!!catalog.filter((item,index,items)=>!MODULES.some(module=>module.id===item.module_id)&&items.findIndex(other=>other.module_id===item.module_id)===index).length && <section className="published-collection"><h2>Community modules</h2><div className="module-grid">{catalog.filter((item,index,items)=>!MODULES.some(module=>module.id===item.module_id)&&items.findIndex(other=>other.module_id===item.module_id)===index).sort((a,b)=>compareModules({id:a.module_id,name:a.title,authorName:a.author,addedAt:a.added_at??undefined},{id:b.module_id,name:b.title,authorName:b.author,addedAt:b.added_at??undefined},sort,statistics)).map(item=><article className="published-card" key={item.module_id}><span className="pill">Reviewed contribution</span><h2><a href={'#community-module/'+item.module_id}>{item.title}</a></h2><p>{item.description}</p><ModulePopularity statistics={statistics?.find(stats=>stats.module_id===item.module_id)}/><a className="text-button" href={'#community-module/'+item.module_id}>View module →</a></article>)}</div></section>}
              <div className="library-note"><span className="status-dot" /><p>This catalog follows an experimental build. Review each module before preparing a configuration.</p></div>
            </div>
          )}
          </>}
        </main>
        {forumRoute&&!route.startsWith('forum/shoutbox')&&<ForumShoutbox floating/>}
        {phoneLayout ? <footer className="phone-footer">
          <p className="phone-footer-status"><span className={'status-dot ' + (firmwareVerified ? 'verified' : '')} /><span>{machineStatus}</span><span role="status">{saveStatus}</span></p>
          {legalLinks}
          {projectNotice}
        </footer> : <footer className={'status-bar'+(allMachines?' is-all-machines':'')}>{legalLinks}<span><span className={'status-dot ' + (firmwareVerified ? 'verified' : '')} />{machineStatus}</span><span className="status-build" role="status">{saveStatus}</span>{machineHasMods ? <a href={deviceHref(currentDevice.id, 'configuration')} aria-live="polite">{machineSelected.length} {machineSelected.length === 1 ? 'module' : 'modules'} selected <Icon name="arrow" size={12} /></a> : <span />}</footer>}
      </div>
    </div>
  )
}
