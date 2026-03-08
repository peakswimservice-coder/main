-- Aggiornamento Schema per Sessioni Multiple (Fondo, Velocità, Altro)

-- 1. Aggiungo la colonna session_type alla tabella training_sessions
ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'Fondo' CHECK (session_type IN ('Fondo', 'Velocità', 'Altro'));

-- 2. Modifico la tabella per far sì che ci possa essere una sola sessione per TIPO in un determinato giorno per un gruppo
-- Prima rimuovo eventuali duplicati (se ci fossero, anche se attualmente non dovrebbero esserci constraints violati)
-- Aggiungo il constraint UNIQUE
ALTER TABLE training_sessions
ADD CONSTRAINT unique_group_date_type UNIQUE (group_id, date, session_type);

-- 3. Aggiorno la funzione RPC get_weekly_distribution
-- Nota: La funzione attuale già raggruppa bene, ma la riscriviamo per sicurezza assicurandoci che peschi indipendentemente dal type
CREATE OR REPLACE FUNCTION get_weekly_distribution(target_group_id UUID, target_date DATE)
RETURNS TABLE (pace TEXT, total_meters BIGINT) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.pace, 
    SUM(ts.reps * ts.distance_meters)::BIGINT as total_meters
  FROM training_sessions sess
  JOIN training_blocks tb ON tb.session_id = sess.id
  JOIN training_sets ts ON ts.block_id = tb.id
  WHERE sess.group_id = target_group_id
    AND sess.date >= date_trunc('week', target_date::timestamp)
    AND sess.date < date_trunc('week', target_date::timestamp) + interval '7 days'
  GROUP BY ts.pace;
END;
$$;

-- 4. Aggiorno la funzione RPC get_historic_weekday_average
-- Dobbiamo estrarre la media lavorando sulle sessioni negli ultimi 4 giorni omologhi 
-- ATTENZIONE: per mantenere coerenza, un giorno omologato potrebbe avere 2 sessioni ora, quindi calcoliamo il volume TOTALE del giorno e POI facciamo la media su 4.
CREATE OR REPLACE FUNCTION get_historic_weekday_average(target_group_id UUID, target_date DATE)
RETURNS TABLE (pace TEXT, avg_meters NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH DistinctDates AS (
    SELECT DISTINCT sess.date
    FROM training_sessions sess
    WHERE sess.group_id = target_group_id
      AND EXTRACT(ISODOW FROM sess.date) = EXTRACT(ISODOW FROM target_date)
      AND sess.date < target_date
    ORDER BY sess.date DESC
    LIMIT 4
  ),
  ValidSessions AS (
    SELECT sess.id
    FROM training_sessions sess
    JOIN DistinctDates dd ON sess.date = dd.date
    WHERE sess.group_id = target_group_id
  )
  SELECT 
    ts.pace, 
    (SUM(ts.reps * ts.distance_meters) / 4.0)::NUMERIC as avg_meters
  FROM ValidSessions vs
  JOIN training_blocks tb ON tb.session_id = vs.id
  JOIN training_sets ts ON ts.block_id = tb.id
  GROUP BY ts.pace;
END;
$$;
