# Take Back & Advantage Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a take-back button (undoes the player's last move + the engine's reply) and a vertical advantage bar (eval after each move, white-at-bottom, no extra API calls) to the play page.

**Architecture:** `useChessGame` gains `currentEval` (white-relative `EngineEval | null`), `takeBack()`, and `canTakeBack`. `ChessGame` adds an `AdvantageBar` component beside the board and a "Take Back" button in the side panel.

**Tech Stack:** Next.js 15, React, TypeScript, chess.js, Vitest + @testing-library/react.

## Global Constraints

- No new API routes or extra network calls.
- All evals stored in white's perspective: positive = white better, negative = black better.
- `canTakeBack` is false while the engine is thinking, a blunder modal is open, or there are fewer than 2 half-moves in history.
- Tests use the `makeFetch` helper pattern already in `useChessGame.test.tsx`.
- Run tests with: `npx vitest run app/play/`

---

### Task 1: Add `currentEval`, `takeBack`, and `canTakeBack` to `useChessGame`

**Files:**
- Modify: `app/play/useChessGame.ts`
- Test: `app/play/useChessGame.test.tsx`

**Interfaces:**
- Produces:
  - `currentEval: EngineEval | null` — white-relative eval; positive = white better, negative = black better; `null` before any move.
  - `takeBack: () => void` — undoes last two half-moves and resets derived state.
  - `canTakeBack: boolean` — true only when ≥2 half-moves played, game is playing, engine is not thinking, no pending blunder.

---

- [ ] **Step 1: Write the failing tests**

Add these four tests inside the existing `describe('useChessGame', ...)` block in `app/play/useChessGame.test.tsx`:

```ts
it('sets currentEval after engine replies', async () => {
  const fetchImpl = makeFetch({
    '/api/engine/evaluate': { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] },
    '/api/engine/move': { move: 'e7e5', eval: { type: 'cp', value: 10 }, pv: [] },
  })
  const { result } = renderHook(() =>
    useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch, engineDelayMs: 0 }),
  )

  await act(async () => {
    await result.current.tryUserMove('e2', 'e4')
  })
  await waitFor(() => expect(result.current.currentEval).not.toBeNull())
  expect(result.current.currentEval?.type).toBe('cp')
})

it('canTakeBack is false at game start', () => {
  const fetchImpl = makeFetch({
    '/api/engine/evaluate': { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] },
    '/api/engine/move': { move: 'e7e5', eval: null, pv: [] },
  })
  const { result } = renderHook(() =>
    useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch }),
  )
  expect(result.current.canTakeBack).toBe(false)
})

it('takeBack restores position to before the last player move', async () => {
  const fetchImpl = makeFetch({
    '/api/engine/evaluate': { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] },
    '/api/engine/move': { move: 'e7e5', eval: { type: 'cp', value: 10 }, pv: [] },
  })
  const { result } = renderHook(() =>
    useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch, engineDelayMs: 0 }),
  )
  const startFen = result.current.fen

  await act(async () => {
    await result.current.tryUserMove('e2', 'e4')
  })
  await waitFor(() => expect(result.current.canTakeBack).toBe(true))

  act(() => { result.current.takeBack() })

  expect(result.current.fen).toBe(startFen)
  expect(result.current.currentEval).toBeNull()
  expect(result.current.lastMoveClass).toBeNull()
  expect(result.current.canTakeBack).toBe(false)
})

it('canTakeBack is false while engine is thinking', async () => {
  let resolveMove!: (v: unknown) => void
  const movePromise = new Promise((res) => { resolveMove = res })
  const fetchImpl = vi.fn(async (url: string) => {
    if (String(url).includes('/api/engine/evaluate'))
      return { ok: true, json: async () => ({ move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] }) } as Response
    return { ok: true, json: () => movePromise } as unknown as Response
  })
  const { result } = renderHook(() =>
    useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch, engineDelayMs: 0 }),
  )

  void act(async () => { await result.current.tryUserMove('e2', 'e4') })
  // engine reply is pending; thinking should be true, canTakeBack false
  await waitFor(() => expect(result.current.thinking).toBe(true))
  expect(result.current.canTakeBack).toBe(false)
  resolveMove({ move: 'e7e5', eval: null, pv: [] })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run app/play/useChessGame.test.tsx
```

Expected: the four new tests fail with errors like `result.current.currentEval is not a property`, `result.current.canTakeBack is not a property`, etc.

- [ ] **Step 3: Implement changes in `useChessGame.ts`**

**3a.** Add `EngineEval` to the types import (line 9):

```ts
import type { Color, BestMoveResult, EngineEval } from '@/lib/engine/types'
```

**3b.** Add the `normalizeToWhite` helper above the `useChessGame` export (after the `randomThinkMs` line):

```ts
function normalizeToWhite(ev: EngineEval | null, sideToMove: Color): EngineEval | null {
  if (!ev) return null
  if (sideToMove === 'white') return ev
  return { type: ev.type, value: -ev.value }
}
```

**3c.** Add `currentEval` state after the `thinking` state line (around line 63):

```ts
const [currentEval, setCurrentEval] = useState<EngineEval | null>(null)
```

**3d.** In `engineReply`, add `setCurrentEval` right after `sync()` (inside the `if (res.move …)` block):

```ts
      const mv = game.move({ from, to, promotion: res.move[4] ?? 'q' })
      setLastMove({ from, to })
      playSound(soundForMove(game, mv))
      sync()
      setCurrentEval(normalizeToWhite(res.eval, engineColor))
```

**3e.** In `tryUserMove`, add `setCurrentEval` after `gradeMove` resolves and before the blunder-warning branch (after `pendingFeedbackRef.current = { moveClass, text }`):

```ts
      pendingFeedbackRef.current = { moveClass, text }
      setCurrentEval(normalizeToWhite(afterEval.eval, engineColor))

      if (lossCp >= BLUNDER_WARNING_CP) {
```

**3f.** Add `takeBack` callback after `cancelPendingMove`:

```ts
  const takeBack = useCallback(() => {
    const game = gameRef.current
    if (game.history().length < 2) return
    game.undo()
    game.undo()
    setLastMove(null)
    setLastMoveClass(null)
    setLastMoveExplanation(null)
    setCurrentEval(null)
    sync()
  }, [sync])
```

**3g.** Replace the `return useMemo(…)` block with the version below (adds `currentEval`, `canTakeBack`, `takeBack` to return value and deps):

```ts
  return useMemo(
    () => {
      const canTakeBack =
        gameRef.current.history().length >= 2 &&
        status === 'playing' &&
        !thinking &&
        pendingBlunder === null
      return {
        fen,
        status,
        result,
        pendingBlunder,
        hint,
        lastMoveClass,
        lastMoveExplanation,
        thinking,
        lastMove,
        currentEval,
        canTakeBack,
        tryUserMove,
        confirmPendingMove,
        cancelPendingMove,
        requestHint,
        takeBack,
        game: gameRef.current,
      }
    },
    [
      fen,
      status,
      result,
      pendingBlunder,
      hint,
      lastMoveClass,
      lastMoveExplanation,
      thinking,
      lastMove,
      currentEval,
      tryUserMove,
      confirmPendingMove,
      cancelPendingMove,
      requestHint,
      takeBack,
    ],
  )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run app/play/useChessGame.test.tsx
```

Expected: all tests pass, including the four new ones.

- [ ] **Step 5: Commit**

```bash
git add app/play/useChessGame.ts app/play/useChessGame.test.tsx
git commit -m "feat: add currentEval, takeBack, and canTakeBack to useChessGame"
```

---

### Task 2: Add `AdvantageBar` and Take Back button to `ChessGame`

**Files:**
- Modify: `app/play/ChessGame.tsx`
- Test: `app/play/ChessGame.test.tsx`

**Interfaces:**
- Consumes from Task 1: `game.currentEval: EngineEval | null`, `game.canTakeBack: boolean`, `game.takeBack: () => void`

---

- [ ] **Step 1: Write the failing tests**

Add two tests inside the existing `describe('ChessGame', ...)` block in `app/play/ChessGame.test.tsx`:

```ts
it('renders the advantage bar', () => {
  render(<ChessGame />)
  expect(screen.getByTestId('advantage-bar')).toBeInTheDocument()
})

it('does not show take-back button at game start', () => {
  render(<ChessGame />)
  expect(screen.queryByRole('button', { name: /take back/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run app/play/ChessGame.test.tsx
```

Expected: both new tests fail (`advantage-bar` not found; this confirms the element doesn't exist yet).

- [ ] **Step 3: Add `EngineEval` import to `ChessGame.tsx`**

On the existing types import line (line 13), add `EngineEval`:

```ts
import type { Color, EngineEval } from '@/lib/engine/types'
```

- [ ] **Step 4: Add the `AdvantageBar` component to `ChessGame.tsx`**

Add this component anywhere above the `ChessGame` function (e.g., after the `SoundToggle` component):

```tsx
function AdvantageBar({ eval: ev }: { eval: EngineEval | null }) {
  const whitePct =
    ev === null
      ? 50
      : ev.type === 'mate'
        ? ev.value > 0 ? 100 : 0
        : 50 + (Math.max(-800, Math.min(800, ev.value)) / 800) * 50

  let label = ''
  if (ev !== null) {
    if (ev.type === 'mate') {
      label = `M${Math.abs(ev.value)}`
    } else if (Math.abs(ev.value) >= 10) {
      const abs = (Math.abs(ev.value) / 100).toFixed(1)
      label = ev.value > 0 ? `+${abs}` : `-${abs}`
    }
  }

  return (
    <div className="relative w-2.5 overflow-hidden rounded bg-[#2a2419]" data-testid="advantage-bar">
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#efd9b4] transition-[height] duration-500"
        style={{ height: `${whitePct}%` }}
      />
      {label && (
        <span
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 text-[8px] font-bold leading-none ${
            whitePct > 50 ? 'bottom-0.5 text-[#241c0c]' : 'top-0.5 text-[#efd9b4]'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Update the board container in `ChessGame` to include the `AdvantageBar`**

In `ChessGame`, find the board container div (the one with `rounded-2xl border border-line-bright`). Replace its children with a flex-row wrapper around the chessboard so the bar sits to the left:

```tsx
<div className="rounded-2xl border border-line-bright bg-gradient-to-b from-[#2a2419] to-[#211c14] p-3 shadow-2xl sm:p-4">
  <CapturedRow pieces={capturedByBlack} advantage={advantage < 0 ? -advantage : 0} />
  <div className="flex items-stretch gap-2">
    <AdvantageBar eval={game.currentEval} />
    <div className="min-w-0 flex-1">
      <Chessboard
        position={game.fen}
        onPieceDrop={onPieceDrop}
        boardOrientation={playerColor}
        arePiecesDraggable={game.status === 'playing'}
        animationDuration={250}
        customSquareStyles={lastMoveStyles}
        customBoardStyle={{ borderRadius: '6px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.7)' }}
        customDarkSquareStyle={{ backgroundColor: '#9a7a4d' }}
        customLightSquareStyle={{ backgroundColor: '#efd9b4' }}
      />
    </div>
  </div>
  <CapturedRow pieces={capturedByWhite} advantage={advantage > 0 ? advantage : 0} />
</div>
```

- [ ] **Step 6: Add the Take Back button to the side panel in `ChessGame`**

In the `<aside>` element, add the button after the `<HintButton …/>` line:

```tsx
<HintButton hint={game.hint} onHint={game.requestHint} />

{game.canTakeBack && (
  <button
    type="button"
    onClick={game.takeBack}
    className="group inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface-2/70 px-3.5 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brass/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
  >
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-brass transition-colors duration-200 group-hover:text-brass-bright"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7v6h6" />
      <path d="M3 13C5.5 6 15 3 21 9" />
    </svg>
    Take Back
  </button>
)}
```

- [ ] **Step 7: Run all play-page tests**

```bash
npx vitest run app/play/
```

Expected: all tests pass, including the two new ChessGame tests.

- [ ] **Step 8: Commit**

```bash
git add app/play/ChessGame.tsx app/play/ChessGame.test.tsx
git commit -m "feat: add advantage bar and take-back button to play page"
```
