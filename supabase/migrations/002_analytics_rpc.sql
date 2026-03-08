-- Analytics Functions

-- 1. Get weekly distribution for a group and a specific date (calculates logic for the week of that date)
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

-- 2. Get moving average for the same weekday over the last 4 homologous days (e.g. last 4 tuesdays)
CREATE OR REPLACE FUNCTION get_historic_weekday_average(target_group_id UUID, target_date DATE)
RETURNS TABLE (pace TEXT, avg_meters NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH HistoricalSessions AS (
    SELECT sess.id
    FROM training_sessions sess
    WHERE sess.group_id = target_group_id
      AND EXTRACT(ISODOW FROM sess.date) = EXTRACT(ISODOW FROM target_date)
      AND sess.date < target_date
    ORDER BY sess.date DESC
    LIMIT 4
  )
  SELECT 
    ts.pace, 
    (SUM(ts.reps * ts.distance_meters) / 4.0)::NUMERIC as avg_meters
  FROM HistoricalSessions hs
  JOIN training_blocks tb ON tb.session_id = hs.id
  JOIN training_sets ts ON ts.block_id = tb.id
  GROUP BY ts.pace;
END;
$$;
