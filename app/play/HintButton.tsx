'use client'

export function HintButton({
  hint,
  onHint,
}: {
  hint: { piece: string | null; move: string | null }
  onHint: () => void
}) {
  return (
    <div>
      <button onClick={onHint}>Hint</button>
      {hint.move ? (
        <span> Best move: {hint.move}</span>
      ) : hint.piece ? (
        <span> Try moving the piece on {hint.piece}</span>
      ) : null}
    </div>
  )
}
