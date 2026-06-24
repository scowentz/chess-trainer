/** Live blunder-warning threshold: warn when the mover loses >= this many centipawns. */
export const BLUNDER_WARNING_CP = 150

/** Move-quality classification bands (centipawns lost by the mover, plus positive-class cutoffs). */
export const CLASSIFY_THRESHOLDS = {
  inaccuracy: 50,
  mistake: 100,
  blunder: 200,
  excellent: 20,
  greatGap: 150,
} as const

/** Centipawn-equivalent magnitude used when converting mate scores to a number. */
export const MATE_SCORE = 100000
