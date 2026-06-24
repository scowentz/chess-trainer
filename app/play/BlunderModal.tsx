'use client'

export function BlunderModal({
  lossCp,
  onConfirm,
  onCancel,
}: {
  lossCp: number
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div role="dialog" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 360 }}>
        <h2>Possible blunder</h2>
        <p>That move looks like it loses about {(lossCp / 100).toFixed(1)} pawns of value. Are you sure?</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onCancel}>Take it back</button>
          <button onClick={onConfirm}>Play it anyway</button>
        </div>
      </div>
    </div>
  )
}
