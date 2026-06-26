# Take Back & Advantage Bar

**Date:** 2026-06-25

## Overview

Two small features for the play page:

1. **Take Back** — undo the player's last move (and the engine's reply to it) without any blunder warning, returning to the position before that move.
2. **Advantage Bar** — a vertical evaluation bar beside the board, updated after each move, showing who is winning in the style of chess.com.

## Take Back

### Hook (`useChessGame.ts`)

- Add `takeBack()`: calls `gameRef.current.undo()` twice (engine's reply first, then player's move), resets `lastMove`, `lastMoveClass`, `lastMoveExplanation`, and `currentEval` to `null`, then calls `sync()`.
- Guard: do nothing if `game.history().length < 2`.
- Expose `takeBack` and `canTakeBack` (`history.length >= 2 && status === 'playing'`) from the hook's return value.

### UI (`ChessGame.tsx`)

- Add a "Take Back" button in the side panel, below the hint button.
- Only renders when `canTakeBack` is true.
- Styled as a secondary button (subtle, not the gold CTA style).
- No confirmation dialog — action is instantaneous.

## Advantage Bar

### Hook (`useChessGame.ts`)

- Add `currentEval: EngineEval | null` to state (initial value: `null`).
- In `tryUserMove`: call `setCurrentEval(afterEval.eval)` after the two evaluations resolve (reflects position after player's move).
- In `engineReply`: call `setCurrentEval(res.eval)` after the engine's move is applied (reflects position after engine's reply).
- Expose `currentEval` from the hook's return value.

### UI (`ChessGame.tsx`)

- Add an `AdvantageBar` component: a narrow vertical bar (~10px wide, full board height) displayed to the left of the `<Chessboard>` using a flex-row wrapper.
- White segment sits at the bottom, black at the top.
- Eval → fill percentage:
  - Centipawns: clamp to ±800 cp, map linearly — `50 + (cp / 800) * 50` → 0–100% white fill.
  - Mate scores: snap to 0% (black mates) or 100% (white mates) depending on sign.
  - No eval yet (null): render at 50%.
- A small text label (`+2.3` or `M4`) floats at the winning end.
- Uses `h-full` with a flex container so it matches board height automatically.

## What is NOT changing

- No extra API calls — eval data is already in-flight from existing `tryUserMove` and `engineReply` requests.
- No blunder warning bypass or changes to the blunder warning flow.
- No changes to move classification, grading, or history tracking.
