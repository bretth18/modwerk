import { Icon } from '../components/Icon'
import { downloadCoverage } from './module-statistics'
import { ModuleWorksCount } from './ModuleWorksCount'
// Working reports and likes lead; `secondary` leaves them out for a page that shows them as tiles of their own.
export function ModulePopularity({statistics,id,secondary=false}:{statistics?:{likes:number;downloads?:number;downloadsStarted?:string|null;sharedConfigurations?:number;worksReports?:number};id?:string;secondary?:boolean}) {
  const shared=statistics?.sharedConfigurations
  return <div className="module-popularity">{!secondary&&<><ModuleWorksCount count={statistics?.worksReports}/><span><Icon name="heart" size={13}/>{statistics ? statistics.likes.toLocaleString() : '—'} {statistics?.likes === 1 ? 'like' : 'likes'}</span></>}<span title={downloadCoverage(statistics?.downloadsStarted)}><Icon name="download" size={13}/>{statistics?.downloads === undefined ? '—' : statistics.downloads.toLocaleString()} {statistics?.downloads === 1 ? 'download' : 'downloads'}</span>{!!shared&&id&&<a href={'#forum?category=configs&module='+encodeURIComponent(id)} title="Shared configurations that include this module"><Icon name="sliders" size={13}/>Used in {shared.toLocaleString()} shared {shared===1?'configuration':'configurations'}</a>}</div>
}
