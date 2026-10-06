import { communityModule } from './modules'

export function ReportNotifications({ id }: { id: string }) {
  return communityModule(id) ? <label className="risk-accept"><input type="checkbox" name="notifyUpdates" defaultChecked />Also follow new releases of this module</label> : null
}
