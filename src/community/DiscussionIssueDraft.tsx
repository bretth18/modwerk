export function DiscussionIssueDraft({ body }: { body: string }) {
  return <details className="issue-report-draft"><summary>Your copied discussion draft</summary><p className="service-note">The original text is kept here for reference. Review the actual result below and add the other report details before sending.</p><pre className="preserve-lines">{body}</pre></details>
}
