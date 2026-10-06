import { communityModule } from './modules'

export function ReportNotifications({ id, defaultChecked = true }: { id: string; defaultChecked?: boolean }) {
  return communityModule(id) ? <label className="risk-accept"><input type="checkbox" name="notifyUpdates" defaultChecked={defaultChecked} />Also follow new releases of this module</label> : null
}
