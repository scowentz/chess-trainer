export function strengthToUciOptions(skill: number): [string, number][] {
  const clamped = Math.max(0, Math.min(20, Math.round(skill)))
  return [['Skill Level', clamped]]
}
