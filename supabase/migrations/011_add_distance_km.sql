-- Add distance_km column to training_sessions
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS distance_km NUMERIC(5,2);

-- Comment for documentation
COMMENT ON COLUMN public.training_sessions.distance_km IS 'Training distance in kilometers';
