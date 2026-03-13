-- 18. Races Schema
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_delegated BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  flyer_url TEXT,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  is_fin BOOLEAN DEFAULT FALSE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE races ENABLE ROW LEVEL SECURITY;

-- Policy for Coaches: ALL operations on races they created
CREATE POLICY "coaches_manage_races" ON races
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coaches 
    WHERE coaches.id = races.coach_id 
    AND coaches.email = auth.jwt()->>'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM coaches 
    WHERE coaches.id = races.coach_id 
    AND coaches.email = auth.jwt()->>'email'
  )
);

-- Policy for Delegated Athletes: ALL operations for races of their coach
-- Note: A delegated athlete can manage all races for their coach to provide full support
CREATE POLICY "delegated_athletes_manage_races" ON races
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athletes 
    WHERE athletes.id = auth.uid() 
    AND athletes.coach_id = races.coach_id 
    AND athletes.is_delegated = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM athletes 
    WHERE athletes.id = auth.uid() 
    AND athletes.coach_id = races.coach_id 
    AND athletes.is_delegated = true
  )
);

-- Policy for Athletes: View races of their group
CREATE POLICY "athletes_view_own_group_races" ON races
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM athletes 
    WHERE athletes.id = auth.uid() 
    AND athletes.group_id = races.group_id
    AND athletes.status = 'active'
  )
);
