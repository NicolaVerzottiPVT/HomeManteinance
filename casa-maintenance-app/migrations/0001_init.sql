PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  model TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  interval_days INTEGER NOT NULL CHECK(interval_days > 0),
  warning_days INTEGER NOT NULL DEFAULT 14 CHECK(warning_days >= 0),
  last_completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_room ON assets(room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_asset ON maintenance_tasks(asset_id);
CREATE INDEX IF NOT EXISTS idx_logs_task ON maintenance_logs(task_id);

INSERT OR IGNORE INTO rooms (id, name, sort_order) VALUES
  (1, 'Cucina', 10),
  (2, 'Bagno', 20),
  (3, 'Camera', 30),
  (4, 'Impianti', 40);

INSERT OR IGNORE INTO assets (id, room_id, name, category, brand, model) VALUES
  (1, 3, 'Condizionatore camera', 'Climatizzazione', 'Daikin', 'FTXM25R'),
  (2, 1, 'Macchina del caffè', 'Cucina', 'DeLonghi', 'Magnifica'),
  (3, 2, 'Lavatrice', 'Elettrodomestici', 'Samsung', 'WW80'),
  (4, 4, 'Caldaia', 'Impianti', 'Vaillant', 'ecoTEC');

INSERT OR IGNORE INTO maintenance_tasks (id, asset_id, name, interval_days, warning_days, last_completed_at) VALUES
  (1, 1, 'Pulizia filtri', 60, 10, date('now', '-72 day')),
  (2, 2, 'Decalcificazione', 90, 14, date('now', '-84 day')),
  (3, 3, 'Pulizia filtro', 90, 14, date('now', '-30 day')),
  (4, 4, 'Manutenzione annuale', 365, 30, date('now', '-300 day'));
