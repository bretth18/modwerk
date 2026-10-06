export type AdminModuleInsight = {
  moduleId: string
  title: string
  available: boolean
  downloads: number
  likes: number
  ratings: number
  ratingAverage: number | null
  comments: number
  openIssues: number
}
export type AdminInsights = {
  generatedAt: string
  downloadsStarted: string | null
  totals: { openIssues: number; closedIssues: number; comments: number; likes: number; ratings: number; downloads: number; published: number; mediaBytes: number }
  issueAges: { underWeek: number; weekToMonth: number; overMonth: number; oldest: string | null }
  modules: AdminModuleInsight[]
}
export type AdminAccountsDay = {
  day: string
  /** Accounts created on this UTC day that still exist. */
  signups: number
  /** Those of the day's sign-ups that have since verified their email and finished any social onboarding. */
  completed: number
  /** Estimated daily visitors from the site statistics; null before usage collection began. */
  visitors: number | null
  /** Distinct members whose visible tab was open on this day; null before presence counting began. */
  active: number | null
}
export type AdminAccounts = {
  generatedAt: string
  from: string
  to: string
  days: number
  /** First UTC day of usage collection, or null when no visit has been counted yet. That day is partial. */
  visitorsFrom: string | null
  /** First UTC day of member presence counting. That day is partial. */
  activeFrom: string | null
  totals: {
    members: number; unverified: number; pendingSocial: number; suspended: number; deleted: number; administrators: number; newsOptIns: number
    /** Members with the site open in a visible tab within the last 5 minutes. */
    online: number
    /** Members seen within the last 24 hours, 7 days and 30 days. */
    activeDay: number
    activeWeek: number
    activeMonth: number
    /** Members who wrote a forum post in the last 30 days. */
    postersMonth: number
  }
  signups: { today: number; last7: number; last30: number }
  methods: { method: 'credential' | 'google' | 'github' | 'discord'; members: number }[]
  /** One row per UTC day from `from` to `to`, including days without sign-ups. */
  daily: AdminAccountsDay[]
  /** Totals for the equally long window of completed days before the current one; today is excluded from both.
   * `visitors` is null unless every day of that window was collected, retained and complete. */
  previous: { from: string; to: string; signups: number; completed: number; visitors: number | null }
}
