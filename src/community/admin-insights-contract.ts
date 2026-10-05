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
export type AdminAccounts = {
  generatedAt: string
  from: string
  to: string
  totals: { members: number; unverified: number; pendingSocial: number; suspended: number; deleted: number; administrators: number; newsOptIns: number }
  signups: { today: number; last7: number; last30: number }
  methods: { method: 'credential' | 'google' | 'github' | 'discord'; members: number }[]
  /** One row per UTC day from `from` to `to`, including days without sign-ups. */
  daily: { day: string; signups: number }[]
}
