import { describe, expect, it } from 'vitest'
import { bayesianRating, ratingPrior, type RatingSummary } from './rating-ranking'

describe('Bayesian rating scores', () => {
  it('uses a vote-weighted prior, ignoring unrated and unavailable summaries', () => {
    expect(ratingPrior([{ average: 5, count: 1 }, { average: 2, count: 9 }, { average: 0, count: 0 }, { average: null, count: 4 }])).toBe(2.3)
    expect(ratingPrior([])).toBe(3)
    expect(ratingPrior([{ average: 0, count: 0 }])).toBe(3)
  })

  it('pulls small samples toward the prior and approaches the observed average as votes accumulate', () => {
    expect(bayesianRating({ average: 5, count: 1 }, 3)).toBeCloseTo(3.3333333333)
    expect(bayesianRating({ average: 1, count: 1 }, 3)).toBeCloseTo(2.6666666667)
    expect(bayesianRating({ average: 5, count: 10000 }, 3)).toBeGreaterThan(4.99)
    expect(bayesianRating({ average: 3, count: 20 }, 3)).toBe(3)
    expect(bayesianRating({ average: 5, count: 1 }, 5)).toBe(5)
    expect(bayesianRating({ average: 1, count: 1 }, 1)).toBe(1)
  })

  it.each<RatingSummary | null | undefined>([
    null, undefined, { average: 5, count: 0 }, { average: null, count: 1 },
    { average: NaN, count: 1 }, { average: Infinity, count: 1 }, { average: 6, count: 1 }, { average: 0, count: 1 },
    { average: 4, count: -1 }, { average: 4, count: 1.5 }, { average: 4, count: Infinity },
  ])('does not invent a score for missing or invalid ratings: %j', summary => {
    expect(bayesianRating(summary, 3)).toBeNull()
    expect(ratingPrior(summary ? [summary] : [])).toBe(3)
  })
})
