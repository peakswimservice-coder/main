-- 6. Policy RLS per la tabella companies (versione granulare)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Pulizia policy esistenti
DROP POLICY IF EXISTS "Allow authenticated select on companies" ON companies;
DROP POLICY IF EXISTS "Allow admin to manage companies" ON companies;
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

-- 1. Lettura permessa a tutti i loggati
CREATE POLICY "companies_select" ON companies 
FOR SELECT TO authenticated 
USING (true);

-- 2. Inserimento permesso solo all'admin
CREATE POLICY "companies_insert" ON companies 
FOR INSERT TO authenticated 
WITH CHECK (auth.jwt()->>'email' = 'peakswimservice@gmail.com');

-- 3. Modifica permessa solo all'admin
CREATE POLICY "companies_update" ON companies 
FOR UPDATE TO authenticated 
USING (auth.jwt()->>'email' = 'peakswimservice@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'peakswimservice@gmail.com');

-- 4. Cancellazione permessa solo all'admin
CREATE POLICY "companies_delete" ON companies 
FOR DELETE TO authenticated 
USING (auth.jwt()->>'email' = 'peakswimservice@gmail.com');
