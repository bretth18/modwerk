/** Only needed when the draft is longer than the description field allows; shorter drafts are copied in full. */
export function DiscussionIssueDraft({ body }: { body: string }) {
  if (body.length <= 2000) return null
  return <details className="issue-report-draft"><summary>Your copied discussion draft</summary><p className="service-note">Your draft is longer than the 2,000 characters a report allows. The full text is kept here; shorten the description below before sending.</p><pre className="preserve-lines">{body}</pre></details>
}
