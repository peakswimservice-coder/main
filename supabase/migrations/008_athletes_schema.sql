-- 8. Atleti e Codici Invito Coach

-- Aggiunta codice invito agli allenatori
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Funzione per generare un codice casuale di 6 caratteri
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Popola i codici invito per i coach esistenti se sono nulli
UPDATE coaches SET invite_code = generate_invite_code() WHERE invite_code IS NULL;

-- Tabella Atleti
CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

-- Policy per athletes
-- 1. L'atleta può vedere il proprio profilo
DROP POLICY IF EXISTS "athletes_self_select" ON athletes;
CREATE POLICY "athletes_self_select" ON athletes
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 2. L'atleta può inserire il proprio profilo iniziale
DROP POLICY IF EXISTS "athletes_self_insert" ON athletes;
CREATE POLICY "athletes_self_insert" ON athletes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. L'atleta può aggiornare il proprio profilo
DROP POLICY IF EXISTS "athletes_self_update" ON athletes;
CREATE POLICY "athletes_self_update" ON athletes
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Il Coach può vedere/gestire i propri atleti
DROP POLICY IF EXISTS "coach_manage_athletes" ON athletes;
CREATE POLICY "coach_manage_athletes" ON athletes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coaches 
    WHERE coaches.id = athletes.coach_id 
    AND coaches.email = auth.jwt()->>'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM coaches 
    WHERE coaches.id = athletes.coach_id 
    AND coaches.email = auth.jwt()->>'email'
  )
);

-- Policy per coaches (permettere agli atleti di trovare il coach dal codice)
DROP POLICY IF EXISTS "allow_athletes_to_find_coach_by_code" ON coaches;
CREATE POLICY "allow_athletes_to_find_coach_by_code" ON coaches
FOR SELECT TO authenticated
USING (true);
