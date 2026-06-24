// chess-trainer/lib/db/openings.ts
import type Database from 'better-sqlite3'
import type { Color } from '../engine/types'
import type { RepertoireTree, TreeNode } from '../openings/build-tree'
import { newCard, schedule, type CardState, type Grade } from '../openings/srs'

export interface RepertoireMeta {
  name: string
  eco: string | null
  color: Color
  startFen: string
  startPath: string[]
  maxDepth: number
  database: string
}

export interface RepertoireRow {
  id: number
  created_at: string
  name: string
  eco: string | null
  color: string
  start_fen: string
  start_path: string
  max_depth: number
  database: string
  built_at: string
}

export interface NodeRow {
  id: number
  repertoire_id: number
  fen: string
  ply: number
  side_to_move: string
  is_trainee_turn: number
  acceptableUci: string[]
  spine_uci: string | null
  opponentReplies: { uci: string; weight: number }[]
  opening_name: string | null
}

export interface RepertoireSummary {
  id: number
  name: string
  eco: string | null
  color: string
  cardCount: number
  dueCount: number
}

interface NodeRowRaw {
  id: number
  repertoire_id: number
  fen: string
  ply: number
  side_to_move: string
  is_trainee_turn: number
  acceptable_uci: string
  spine_uci: string | null
  opponent_replies: string
  opening_name: string | null
}

function parseNode(r: NodeRowRaw): NodeRow {
  return {
    id: r.id,
    repertoire_id: r.repertoire_id,
    fen: r.fen,
    ply: r.ply,
    side_to_move: r.side_to_move,
    is_trainee_turn: r.is_trainee_turn,
    acceptableUci: JSON.parse(r.acceptable_uci) as string[],
    spine_uci: r.spine_uci,
    opponentReplies: JSON.parse(r.opponent_replies) as { uci: string; weight: number }[],
    opening_name: r.opening_name,
  }
}

function insertNode(db: Database.Database, repertoireId: number, n: TreeNode): void {
  db.prepare(
    `INSERT INTO repertoire_nodes
       (repertoire_id, fen, ply, side_to_move, is_trainee_turn, acceptable_uci, spine_uci, opponent_replies, opening_name)
     VALUES (@repertoireId, @fen, @ply, @sideToMove, @isTraineeTurn, @acceptableUci, @spineUci, @opponentReplies, @openingName)`,
  ).run({
    repertoireId,
    fen: n.fen,
    ply: n.ply,
    sideToMove: n.sideToMove,
    isTraineeTurn: n.isTraineeTurn ? 1 : 0,
    acceptableUci: JSON.stringify(n.acceptableUci),
    spineUci: n.spineUci,
    opponentReplies: JSON.stringify(n.opponentReplies),
    openingName: n.openingName,
  })
}

function cardToRow(c: CardState): {
  ease: number; interval_days: number; due_at: string; reps: number; lapses: number; last_grade: string | null
} {
  return {
    ease: c.ease,
    interval_days: c.intervalDays,
    due_at: c.dueAt,
    reps: c.reps,
    lapses: c.lapses,
    last_grade: c.lastGrade,
  }
}

function syncCards(db: Database.Database, repertoireId: number, nodes: TreeNode[], now: Date): void {
  const traineeFens = nodes.filter((n) => n.isTraineeTurn).map((n) => n.fen)
  const traineeSet = new Set(traineeFens)

  // Insert a fresh card for any trainee fen that does not already have one.
  // New cards are seeded as immediately due (due_at = epoch) so they surface in the very next
  // drill session regardless of when the repertoire was built or rebuilt.
  const exists = db.prepare('SELECT 1 FROM srs_cards WHERE repertoire_id = ? AND fen = ?')
  const insert = db.prepare(
    `INSERT INTO srs_cards (repertoire_id, fen, ease, interval_days, due_at, reps, lapses, last_grade, last_reviewed_at)
     VALUES (@repertoireId, @fen, @ease, @interval_days, @due_at, @reps, @lapses, @last_grade, NULL)`,
  )
  const fresh = newCard(now)
  // Override due_at to epoch so new cards are always immediately due.
  const freshRow = { ...cardToRow(fresh), due_at: new Date(0).toISOString() }
  for (const fen of traineeFens) {
    if (!exists.get(repertoireId, fen)) {
      insert.run({ repertoireId, fen, ...freshRow })
    }
  }

  // Prune cards whose fen is no longer a trainee node.
  const all = db.prepare('SELECT fen FROM srs_cards WHERE repertoire_id = ?').all(repertoireId) as { fen: string }[]
  const del = db.prepare('DELETE FROM srs_cards WHERE repertoire_id = ? AND fen = ?')
  for (const { fen } of all) {
    if (!traineeSet.has(fen)) del.run(repertoireId, fen)
  }
}

function replaceNodes(db: Database.Database, repertoireId: number, nodes: TreeNode[]): void {
  db.prepare('DELETE FROM repertoire_nodes WHERE repertoire_id = ?').run(repertoireId)
  for (const n of nodes) insertNode(db, repertoireId, n)
}

export function saveBuiltRepertoire(
  db: Database.Database,
  args: { meta: RepertoireMeta; tree: RepertoireTree; now: Date },
): number {
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO repertoires (name, eco, color, start_fen, start_path, max_depth, database, built_at)
         VALUES (@name, @eco, @color, @start_fen, @start_path, @max_depth, @database, @built_at)`,
      )
      .run({
        name: args.meta.name,
        eco: args.meta.eco,
        color: args.meta.color,
        start_fen: args.meta.startFen,
        start_path: JSON.stringify(args.meta.startPath),
        max_depth: args.meta.maxDepth,
        database: args.meta.database,
        built_at: args.now.toISOString(),
      })
    const id = Number(info.lastInsertRowid)
    replaceNodes(db, id, args.tree.nodes)
    syncCards(db, id, args.tree.nodes, args.now)
    return id
  })
  return tx()
}

export function rebuildRepertoire(
  db: Database.Database,
  repertoireId: number,
  tree: RepertoireTree,
  now: Date,
): void {
  const tx = db.transaction(() => {
    replaceNodes(db, repertoireId, tree.nodes)
    syncCards(db, repertoireId, tree.nodes, now)
    db.prepare('UPDATE repertoires SET built_at = ? WHERE id = ?').run(now.toISOString(), repertoireId)
  })
  tx()
}

export function listRepertoires(db: Database.Database, now: Date): RepertoireSummary[] {
  const rows = db.prepare('SELECT * FROM repertoires ORDER BY id DESC').all() as RepertoireRow[]
  return rows.map((r) => {
    const cardCount = (db.prepare('SELECT COUNT(*) c FROM srs_cards WHERE repertoire_id = ?').get(r.id) as { c: number }).c
    const dueCount = (
      db.prepare('SELECT COUNT(*) c FROM srs_cards WHERE repertoire_id = ? AND due_at <= ?').get(r.id, now.toISOString()) as { c: number }
    ).c
    return { id: r.id, name: r.name, eco: r.eco, color: r.color, cardCount, dueCount }
  })
}

export function getRepertoire(
  db: Database.Database,
  id: number,
): { repertoire: RepertoireRow; nodes: NodeRow[] } | null {
  const repertoire = db.prepare('SELECT * FROM repertoires WHERE id = ?').get(id) as RepertoireRow | undefined
  if (!repertoire) return null
  const raw = db.prepare('SELECT * FROM repertoire_nodes WHERE repertoire_id = ? ORDER BY ply ASC, id ASC').all(id) as NodeRowRaw[]
  return { repertoire, nodes: raw.map(parseNode) }
}

export function getDueNodes(db: Database.Database, id: number, now: Date): NodeRow[] {
  const raw = db
    .prepare(
      `SELECT n.* FROM repertoire_nodes n
         JOIN srs_cards c ON c.repertoire_id = n.repertoire_id AND c.fen = n.fen
       WHERE n.repertoire_id = ? AND n.is_trainee_turn = 1 AND c.due_at <= ?
       ORDER BY c.due_at ASC`,
    )
    .all(id, now.toISOString()) as NodeRowRaw[]
  return raw.map(parseNode)
}

export function recordReview(
  db: Database.Database,
  id: number,
  fen: string,
  grade: Grade,
  now: Date,
): CardState | null {
  const row = db.prepare('SELECT * FROM srs_cards WHERE repertoire_id = ? AND fen = ?').get(id, fen) as
    | { ease: number; interval_days: number; due_at: string; reps: number; lapses: number; last_grade: Grade | null }
    | undefined
  if (!row) return null
  const current: CardState = {
    ease: row.ease,
    intervalDays: row.interval_days,
    dueAt: row.due_at,
    reps: row.reps,
    lapses: row.lapses,
    lastGrade: row.last_grade,
  }
  const next = schedule(current, grade, now)
  db.prepare(
    `UPDATE srs_cards
       SET ease=@ease, interval_days=@interval_days, due_at=@due_at, reps=@reps, lapses=@lapses,
           last_grade=@last_grade, last_reviewed_at=@last_reviewed_at
     WHERE repertoire_id=@repertoireId AND fen=@fen`,
  ).run({ repertoireId: id, fen, ...cardToRow(next), last_reviewed_at: now.toISOString() })
  return next
}

export function deleteRepertoire(db: Database.Database, id: number): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM srs_cards WHERE repertoire_id = ?').run(id)
    db.prepare('DELETE FROM repertoire_nodes WHERE repertoire_id = ?').run(id)
    db.prepare('DELETE FROM repertoires WHERE id = ?').run(id)
  })
  tx()
}
