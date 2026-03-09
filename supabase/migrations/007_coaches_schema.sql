-- 7. Allenatori (Coaches) associati alle società
CREATE TABLE IF NOT EXISTS coaches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Policy per la tabella coaches

-- 1. Lettura per gli allenatori stessi (possono vedere il proprio profilo)
CREATE POLICY "coaches_self_select" ON coaches
FOR SELECT TO authenticated
USING (auth.jwt()->>'email' = email);

-- 2. La società (Account Manager) può gestire i propri allenatori
-- Nota: Usiamo una subquery per verificare se l'utente loggato è l'account manager della società a cui appartiene l'allenatore
CREATE POLICY "company_manage_coaches" ON coaches
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = coaches.company_id 
    AND companies.account_manager_email = auth.jwt()->>'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = coaches.company_id 
    AND companies.account_manager_email = auth.jwt()->>'email'
  )
);

-- 3. Super Admin può vedere/gestire tutto (opzionale, ma utile per manutenzione)
CREATE POLICY "admin_manage_all_coaches" ON coaches
FOR ALL TO authenticated
USING (auth.jwt()->>'email' = 'peakswimservice@gmail.com');
