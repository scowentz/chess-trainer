'use client'

export function StrengthSelector({ skill, onChange }: { skill: number; onChange: (skill: number) => void }) {
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      Engine strength: {skill}
      <input
        type="range"
        min={0}
        max={20}
        value={skill}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
