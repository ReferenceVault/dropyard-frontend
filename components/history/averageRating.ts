// The average star rating over the sales that were actually rated, to one
// decimal ("4.5"), or null when none were. An unrated sale carries rating 0 (or
// none at all) and is left out, so 5 + 4 + unrated is 4.5, not 3.0.
export function averageRating(rows: ReadonlyArray<{ rating?: number | null }>): string | null {
  const rated = rows.map((r) => r.rating).filter((n): n is number => typeof n === "number" && n > 0);
  if (!rated.length) return null;
  return (rated.reduce((a, n) => a + n, 0) / rated.length).toFixed(1);
}
