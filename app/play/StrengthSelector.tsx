'use client'

function strengthLabel(skill: number): string {
  if (skill <= 2) return 'Beginner'
  if (skill <= 6) return 'Casual'
  if (skill <= 10) return 'Club'
  if (skill <= 14) return 'Strong'
  if (skill <= 18) return 'Expert'
  return 'Master'
}

export function StrengthSelector({ skill, onChange }: { skill: number; onChange: (skill: number) => void }) {
  const fill = `${(skill / 20) * 100}%`
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="strength" className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          Engine strength
        </label>
        <span className="flex items-baseline gap-2">
          <span className="font-serif text-base font-semibold text-brass-bright">{strengthLabel(skill)}</span>
          <span className="tabular-nums text-xs text-faint">{skill}/20</span>
        </span>
      </div>
      <input
        id="strength"
        type="range"
        min={0}
        max={20}
        value={skill}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--range-fill' as string]: fill }}
        aria-label="Engine strength"
      />
    </div>
  )
}
