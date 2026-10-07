import { useState } from 'react'
import { useCommunity } from './context'
import { followDownloadedModules } from './download-follows'

export function useDownloadFollows() {
  const { session } = useCommunity()
  const [followNotice, setFollowNotice] = useState('')
  function followDownloads(ids: readonly string[]) {
    if (!session.user?.verified || !ids.length) return
    setFollowNotice('Saving module update preferences…')
    void followDownloadedModules(ids).then(result => {
      window.dispatchEvent(new Event('modwerk-module-updates'))
      setFollowNotice(result.failed ? 'Your download started, but update preferences could not be saved. Use Get update notifications on each module page.'
        : result.followed ? 'You’re following updates for downloaded modules. Unfollow on a module page to opt out.'
        : 'Your existing update opt-outs are kept. Use Get update notifications on a module page to follow again.')
    })
  }
  return { followDownloads, followNotice }
}
