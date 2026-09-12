PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS asset_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  icon TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_type_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  interval_days INTEGER NOT NULL CHECK(interval_days > 0),
  warning_days INTEGER NOT NULL DEFAULT 14 CHECK(warning_days >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE CASCADE,
  UNIQUE(asset_type_id, name)
);

ALTER TABLE assets ADD COLUMN asset_type_id INTEGER REFERENCES asset_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON maintenance_templates(asset_type_id);

INSERT OR IGNORE INTO asset_types (id, name, category) VALUES
  (1, 'Lavatrice', 'Elettrodomestici'),
  (2, 'Lavastoviglie', 'Elettrodomestici'),
  (3, 'Macchina del caffè', 'Cucina'),
  (4, 'Climatizzatore', 'Climatizzazione'),
  (5, 'Caldaia', 'Impianti'),
  (6, 'Frigorifero', 'Elettrodomestici'),
  (7, 'Forno', 'Cucina'),
  (8, 'Cappa aspirante', 'Cucina');

INSERT OR IGNORE INTO maintenance_templates (asset_type_id, name, interval_days, warning_days) VALUES
  (1, 'Pulizia filtro', 90, 14),
  (1, 'Ciclo pulizia cestello', 30, 7),
  (2, 'Pulizia filtro', 30, 7),
  (2, 'Pulizia irroratori', 90, 14),
  (3, 'Decalcificazione', 90, 14),
  (3, 'Pulizia gruppo erogatore', 30, 7),
  (4, 'Pulizia filtri', 60, 10),
  (4, 'Pulizia approfondita', 365, 30),
  (5, 'Manutenzione annuale', 365, 30),
  (6, 'Pulizia condensatore', 180, 30),
  (7, 'Pulizia approfondita', 90, 14),
  (8, 'Pulizia filtro antigrasso', 30, 7),
  (8, 'Sostituzione filtro carbone', 120, 20);

UPDATE assets SET asset_type_id = 1 WHERE name = 'Lavatrice' AND asset_type_id IS NULL;
UPDATE assets SET asset_type_id = 3 WHERE name = 'Macchina del caffè' AND asset_type_id IS NULL;
UPDATE assets SET asset_type_id = 4 WHERE name LIKE 'Condizionatore%' AND asset_type_id IS NULL;
UPDATE assets SET asset_type_id = 5 WHERE name = 'Caldaia' AND asset_type_id IS NULL;
