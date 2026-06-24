export type Grade = 'good' | 'again'

export interface CardState {
  ease: number
  intervalDays: number
  dueAt: string
  reps: number
  lapses: number
  lastGrade: Grade | null
}

const MIN_EASE = 1.3
const GRADUATE_DAYS = 1
const LEARN_STEP_MIN = 10

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000)
}
function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60000)
}

export function newCard(now: Date): CardState {
  return { ease: 2.5, intervalDays: 0, dueAt: now.toISOString(), reps: 0, lapses: 0, lastGrade: null }
}

export function schedule(card: CardState, grade: Grade, now: Date): CardState {
  const graduated = card.intervalDays >= GRADUATE_DAYS
  if (grade === 'again') {
    return {
      ease: graduated ? Math.max(MIN_EASE, card.ease - 0.2) : card.ease,
      intervalDays: 0,
      dueAt: addMinutes(now, LEARN_STEP_MIN).toISOString(),
      reps: card.reps,
      lapses: card.lapses + (graduated ? 1 : 0),
      lastGrade: 'again',
    }
  }
  const intervalDays = graduated ? Math.round(card.intervalDays * card.ease) : GRADUATE_DAYS
  return {
    ease: card.ease,
    intervalDays,
    dueAt: addDays(now, intervalDays).toISOString(),
    reps: card.reps + 1,
    lapses: card.lapses,
    lastGrade: 'good',
  }
}

export function isDue(card: CardState, now: Date): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime()
}
