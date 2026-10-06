import { communityModule } from './modules'

export function ReportNotifications({ id }: { id: string }) {
  return <>
    <p className="service-note">Status changes appear in your bell and unread activity emails. Choose email topics and frequency in <a href="#account/notifications">notification settings</a>.</p>
    {communityModule(id) && <label className="risk-accept"><input type="checkbox" name="notifyUpdates" defaultChecked />Also follow new releases of this module by bell and email</label>}
  </>
}
