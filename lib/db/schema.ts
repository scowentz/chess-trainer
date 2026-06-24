export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    skill_level INTEGER NOT NULL,
    player_color TEXT NOT NULL,
    result TEXT,
    pgn TEXT
  );

  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id),
    ply INTEGER NOT NULL,
    side TEXT NOT NULL,
    uci TEXT NOT NULL,
    fen_before TEXT NOT NULL,
    fen_after TEXT NOT NULL,
    eval_cp INTEGER,
    classification TEXT
  );
`
