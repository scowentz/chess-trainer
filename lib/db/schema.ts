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

  CREATE TABLE IF NOT EXISTS repertoires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL,
    eco TEXT,
    color TEXT NOT NULL,
    start_fen TEXT NOT NULL,
    start_path TEXT NOT NULL,
    max_depth INTEGER NOT NULL,
    database TEXT NOT NULL,
    built_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS repertoire_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repertoire_id INTEGER NOT NULL REFERENCES repertoires(id),
    fen TEXT NOT NULL,
    ply INTEGER NOT NULL,
    side_to_move TEXT NOT NULL,
    is_trainee_turn INTEGER NOT NULL,
    acceptable_uci TEXT NOT NULL,
    spine_uci TEXT,
    opponent_replies TEXT NOT NULL,
    opening_name TEXT,
    UNIQUE(repertoire_id, fen)
  );

  CREATE TABLE IF NOT EXISTS srs_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repertoire_id INTEGER NOT NULL REFERENCES repertoires(id),
    fen TEXT NOT NULL,
    ease REAL NOT NULL,
    interval_days REAL NOT NULL,
    due_at TEXT NOT NULL,
    reps INTEGER NOT NULL,
    lapses INTEGER NOT NULL,
    last_grade TEXT,
    last_reviewed_at TEXT,
    UNIQUE(repertoire_id, fen)
  );
`
