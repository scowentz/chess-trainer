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

/**
 * Minimum SEE gain (cp) required to report a piece as "hanging".
 * A value of 50 filters out near-equal trades (e.g. bishop vs knight = 10 cp)
 * that look defended to a human but technically favour the attacker by a tiny margin.
 */
export const HANGING_THRESHOLD_CP = 50
