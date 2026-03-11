-- 9. Activity Tracking and Analytics
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_manager_last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for performance on joins/counts
CREATE INDEX IF NOT EXISTS idx_coaches_company_active ON coaches(company_id, last_active_at);
CREATE INDEX IF NOT EXISTS idx_athletes_coach_active ON athletes(coach_id, last_active_at);
