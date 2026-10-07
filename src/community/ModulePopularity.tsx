import { Icon } from '../components/Icon'
import { downloadCoverage } from './module-statistics'
export function ModulePopularity({statistics,id}:{statistics?:{likes:number;downloads?:number;downloadsStarted?:string|null;sharedConfigurations?:number};id?:string}) {
  const shared=statistics?.sharedConfigurations
  return <div className="module-popularity"><span><Icon name="heart" size={13}/>{statistics ? statistics.likes.toLocaleString() : '—'} {statistics?.likes === 1 ? 'like' : 'likes'}</span><span title={downloadCoverage(statistics?.downloadsStarted)}><Icon name="download" size={13}/>{statistics?.downloads === undefined ? '—' : statistics.downloads.toLocaleString()} {statistics?.downloads === 1 ? 'download' : 'downloads'}</span>{!!shared&&id&&<a href={'#forum?category=configs&module='+encodeURIComponent(id)} title="Shared configurations that include this module"><Icon name="sliders" size={13}/>Used in {shared.toLocaleString()} shared {shared===1?'configuration':'configurations'}</a>}</div>
}
