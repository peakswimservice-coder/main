-- Remove distance_km column from training_sessions

ALTER TABLE public.training_sessions DROP COLUMN IF EXISTS distance_km;
