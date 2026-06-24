import Database from 'better-sqlite3'
import path from 'path'
import { CREATE_TABLES } from './schema'

const DB_PATH = path.join(process.cwd(), 'chess-trainer.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    _db.exec(CREATE_TABLES)
  }
  return _db
}
