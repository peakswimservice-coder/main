-- 1. Gruppi (Es. 'Agonisti', 'Esordienti A')
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  coach_id UUID REFERENCES auth.users(id)
);

-- Inseriamo dei dati mock per i gruppi se non ci sono già
INSERT INTO groups (name)
SELECT 'Agonisti' WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Agonisti');
INSERT INTO groups (name)
SELECT 'Esordienti A' WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Esordienti A');
INSERT INTO groups (name)
SELECT 'Master' WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Master');

-- 2. Allenamenti (La sessione giornaliera di un gruppo)
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  date DATE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Blocchi (Es. 'Riscaldamento', 'Lavoro Principale')
CREATE TABLE IF NOT EXISTS training_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- 4. Set (Es. 10x300 B2)
CREATE TABLE IF NOT EXISTS training_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  block_id UUID REFERENCES training_blocks(id) ON DELETE CASCADE,
  reps INTEGER NOT NULL DEFAULT 1,
  distance_meters INTEGER NOT NULL,
  description TEXT,
  pace TEXT CHECK (pace IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D')),
  order_index INTEGER NOT NULL
);
