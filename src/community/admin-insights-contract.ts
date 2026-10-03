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
