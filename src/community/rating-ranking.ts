export type RatingSummary = { average: number | null; count: number }

// Five votes at the community mean keep small samples from dominating discovery.
export const RATING_PRIOR_COUNT = 5
export const RATING_RANKING_NOTE = 'Rating rankings balance average stars with the number of votes. Ratings with fewer votes stay closer to the community average; displayed stars are the actual averages.'

function hasRatings(summary: RatingSummary | null | undefined): summary is { average: number; count: number } {
  return !!summary && Number.isInteger(summary.count) && summary.count > 0
    && summary.average !== null && Number.isFinite(summary.average) && summary.average >= 1 && summary.average <= 5
}

/** Vote-weighted mean of the complete, unfiltered statistics response. */
export function ratingPrior(ratings: readonly RatingSummary[]): number {
  let sum = 0, count = 0
  for (const summary of ratings) if (hasRatings(summary)) {
    sum += summary.average * summary.count
    count += summary.count
  }
  return count ? sum / count : 3
}

/** Posterior mean on the 1–5 star scale; unrated modules have no ranking score. */
export function bayesianRating(summary: RatingSummary | null | undefined, prior: number): number | null {
  if (!hasRatings(summary)) return null
  return (summary.average * summary.count + prior * RATING_PRIOR_COUNT) / (summary.count + RATING_PRIOR_COUNT)
}
