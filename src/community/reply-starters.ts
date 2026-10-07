/** The kinds of reply a module discussion invites. A chosen one labels the reply with its own bold line. */
export const REPLY_STARTERS = ['question', 'tip', 'settings', 'works'] as const
export type ReplyStarter = typeof REPLY_STARTERS[number]

export function starterLabel(starter: ReplyStarter, machine: string) {
  return starter === 'question' ? 'Question' : starter === 'tip' ? 'Tip' : starter === 'settings' ? 'My settings' : 'Works on my ' + machine
}
export function starterHint(starter: ReplyStarter | '') {
  return starter === 'question' ? 'Ask about a control, a sound, or how it plays with other modules.'
    : starter === 'tip' ? 'A trick, a use you found, or something others should try.'
    : starter === 'settings' ? 'The values you use and what they do for your sound.'
    : starter === 'works' ? 'Which version you flashed, what else was in the build, and how it plays.'
    : 'Pick one to label your reply, or just write.'
}
/** The reply as posted: the label as its own line, so it reads the same whatever the reply starts with. */
export function starterBody(starter: ReplyStarter | '', machine: string, body: string) {
  return starter ? '**' + starterLabel(starter, machine) + '**\n\n' + body : body
}
