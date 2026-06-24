// chess-trainer/lib/db/openings.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from './schema'
import {
  saveBuiltRepertoire,
  rebuildRepertoire,
  listRepertoires,
  getRepertoire,
  getDueNodes,
  recordReview,
  deleteRepertoire,
  type RepertoireMeta,
} from './openings'
import type { RepertoireTree, TreeNode } from '../openings/build-tree'

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(CREATE_TABLES)
  return db
}

const META: RepertoireMeta = {
  name: 'Italian Game',
  eco: 'C50',
  color: 'white',
  startFen: 'startfen',
  startPath: ['e2e4'],
  maxDepth: 12,
  database: 'masters',
}

function traineeNode(fen: string): TreeNode {
  return {
    fen, ply: 0, sideToMove: 'white', isTraineeTurn: true,
    acceptableUci: ['e2e4', 'd2d4'], spineUci: 'e2e4', opponentReplies: [], openingName: 'Italian Game',
  }
}
function opponentNode(fen: string): TreeNode {
  return {
    fen, ply: 1, sideToMove: 'black', isTraineeTurn: false,
    acceptableUci: [], spineUci: 'e7e5',
    opponentReplies: [{ uci: 'e7e5', weight: 60 }, { uci: 'c7c5', weight: 40 }], openingName: null,
  }
}

const T0 = new Date('2026-06-24T12:00:00.000Z')

let db: Database.Database
beforeEach(() => {
  db = freshDb()
})

describe('openings repository', () => {
  it('saves a built repertoire with nodes and seeds cards for trainee nodes', () => {
    const tree: RepertoireTree = { startFen: 'startfen', nodes: [traineeNode('f1'), opponentNode('f2')] }
    const id = saveBuiltRepertoire(db, { meta: META, tree, now: T0 })
    expect(id).toBeGreaterThan(0)

    const got = getRepertoire(db, id)!
    expect(got.nodes).toHaveLength(2)
    const trainee = got.nodes.find((n) => n.fen === 'f1')!
    expect(trainee.acceptableUci).toEqual(['e2e4', 'd2d4'])

    // Only the trainee node became a due card.
    const due = getDueNodes(db, id, T0)
    expect(due.map((n) => n.fen)).toEqual(['f1'])
  })

  it('records a review and advances the card so it is no longer due now', () => {
    const tree: RepertoireTree = { startFen: 'startfen', nodes: [traineeNode('f1')] }
    const id = saveBuiltRepertoire(db, { meta: META, tree, now: T0 })
    const state = recordReview(db, id, 'f1', 'good', T0)!
    expect(state.intervalDays).toBe(1)
    expect(getDueNodes(db, id, T0)).toHaveLength(0)
  })

  it('rebuild preserves SRS progress for surviving fens and prunes vanished ones', () => {
    const tree1: RepertoireTree = { startFen: 'startfen', nodes: [traineeNode('keep'), traineeNode('gone')] }
    const id = saveBuiltRepertoire(db, { meta: META, tree: tree1, now: T0 })
    recordReview(db, id, 'keep', 'good', T0) // advance "keep" to 1-day interval

    const tree2: RepertoireTree = { startFen: 'startfen', nodes: [traineeNode('keep'), traineeNode('new')] }
    rebuildRepertoire(db, id, tree2, new Date(T0.getTime() + 60000))

    // "keep" retains its advanced schedule (not due now); "gone" pruned; "new" is due.
    const dueFens = getDueNodes(db, id, T0).map((n) => n.fen)
    expect(dueFens).toContain('new')
    expect(dueFens).not.toContain('keep')
    expect(dueFens).not.toContain('gone')
  })

  it('lists repertoires with card and due counts', () => {
    const tree: RepertoireTree = { startFen: 'startfen', nodes: [traineeNode('f1'), opponentNode('f2')] }
    const id = saveBuiltRepertoire(db, { meta: META, tree, now: T0 })
    const list = listRepertoires(db, T0)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id, name: 'Italian Game', cardCount: 1, dueCount: 1 })
  })

  it('deletes a repertoire and its rows', () => {
    const tree: RepertoireTree = { startFen: 'startfen', nodes: [traineeNode('f1')] }
    const id = saveBuiltRepertoire(db, { meta: META, tree, now: T0 })
    deleteRepertoire(db, id)
    expect(getRepertoire(db, id)).toBeNull()
    expect(listRepertoires(db, T0)).toHaveLength(0)
  })
})
