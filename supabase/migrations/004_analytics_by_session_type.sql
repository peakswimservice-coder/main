-- Aggiornamento Funzioni Analytics per filtrare per session_type

-- 1. Aggiorno get_weekly_distribution
CREATE OR REPLACE FUNCTION get_weekly_distribution(target_group_id UUID, target_date DATE, target_session_type TEXT)
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
    AND sess.session_type = target_session_type
    AND sess.date >= date_trunc('week', target_date::timestamp)
    AND sess.date < date_trunc('week', target_date::timestamp) + interval '7 days'
  GROUP BY ts.pace;
END;
$$;

-- 2. Aggiorno get_historic_weekday_average
CREATE OR REPLACE FUNCTION get_historic_weekday_average(target_group_id UUID, target_date DATE, target_session_type TEXT)
RETURNS TABLE (pace TEXT, avg_meters NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH DistinctDates AS (
    SELECT DISTINCT sess.date
    FROM training_sessions sess
    WHERE sess.group_id = target_group_id
      AND sess.session_type = target_session_type
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
      AND sess.session_type = target_session_type
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
