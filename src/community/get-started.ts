/** The new-member checklist: what the forum home and the account page show until every step is done or the member dismisses it. */
export type GetStartedInput = { username: string; displayName: string; avatar?: string | null; introductions: number; followedModules: number; pushEnabled: boolean }
export type GetStartedStep = { id: 'profile' | 'introduce' | 'follow' | 'notify'; title: string; detail: string; action: string; href: string; done: boolean }
export const getStartedKey = (memberId: string) => 'modwerk.get-started.dismissed:' + memberId
export function getStartedSteps(input: GetStartedInput, machine?: string): GetStartedStep[] {
  const named = !!input.avatar || input.displayName.trim().toLowerCase() !== input.username.trim().toLowerCase()
  return [
    { id: 'profile', title: 'Add a picture or display name', detail: 'Make your posts easy to recognise.', action: 'Edit profile', href: '#account', done: named },
    { id: 'introduce', title: 'Say hello in Introductions', detail: 'Tell us which machines you play and what you are after.', action: 'Write an intro', href: '#forum/new?category=introductions', done: input.introductions > 0 },
    { id: 'follow', title: 'Follow a module thread', detail: 'New releases and replies for modules you use land in your bell.', action: 'Browse modules', href: '#forum?view=modules' + (machine ? '&machine=' + encodeURIComponent(machine) : ''), done: input.followedModules > 0 },
    { id: 'notify', title: 'Turn on notifications', detail: 'Push on this device, or an email digest, from your account settings.', action: 'Notification settings', href: '#account/notifications', done: input.pushEnabled },
  ]
}
export function getStartedComplete(steps: GetStartedStep[]) { return steps.every(step => step.done) }
