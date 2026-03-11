-- 1. Pulizia dati esistenti (come richiesto, siamo in sviluppo)
TRUNCATE training_sets CASCADE;
TRUNCATE training_blocks CASCADE;
TRUNCATE training_sessions CASCADE;

-- 2. Modifica training_sessions per supportare un unico testo
ALTER TABLE training_sessions 
DROP CONSTRAINT IF EXISTS unique_group_date_type,
DROP COLUMN IF EXISTS session_type,
ADD COLUMN IF NOT EXISTS content TEXT;

-- 3. Nuovo vincolo: un solo allenamento per gruppo al giorno
ALTER TABLE training_sessions
ADD CONSTRAINT unique_group_date UNIQUE (group_id, date);

-- 4. Rimoziine tabelle non più necessarie
DROP TABLE IF EXISTS training_sets;
DROP TABLE IF EXISTS training_blocks;

-- 5. Rimozione funzioni di analytics sulle andature
DROP FUNCTION IF EXISTS get_weekly_distribution(UUID, DATE);
DROP FUNCTION IF EXISTS get_historic_weekday_average(UUID, DATE);
DROP FUNCTION IF EXISTS get_weekly_distribution(UUID, DATE, TEXT);
DROP FUNCTION IF EXISTS get_historic_weekday_average(UUID, DATE, TEXT);
