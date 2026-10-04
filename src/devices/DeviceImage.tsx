import { DeviceArt } from './DeviceArt'
import { MACHINE_PHOTOS } from './photos'
import type { DeviceProfile } from './registry'

// A machine's freely licensed photo, or the line drawing when no photo is available yet.
export function DeviceImage({ device }: { device: DeviceProfile }) {
  const photo = MACHINE_PHOTOS[device.id]
  if (!photo) return <DeviceArt art={device.art} />
  return <img className={'device-photo' + (photo.cutout ? ' is-cutout' : '')} src={import.meta.env.BASE_URL + photo.src} alt="" loading="lazy" decoding="async" title={'Photo: ' + photo.author + ' · ' + photo.license} />
}

export function PhotoCredit({ device }: { device: DeviceProfile }) {
  const photo = MACHINE_PHOTOS[device.id]
  if (!photo) return null
  return <p className="photo-credit">Image: <a href={photo.source} target="_blank" rel="noreferrer">{photo.author}</a>, {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> : photo.license.toLowerCase()}{photo.via !== photo.author && <>, via {photo.via}</>}</p>
}
