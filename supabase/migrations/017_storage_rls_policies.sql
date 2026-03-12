-- 17. Politiche di Sicurezza per lo Storage (Tesserini Federali)
-- Questo script imposta le regole di accesso per il bucket 'federation-cards'.

-- 1. Permetti agli atleti di gestire i propri file (Upload, Select, Update, Delete)
-- Basato sulla struttura della cartella: 'federation-cards/ID_ATLETA/nomefile.est'
DROP POLICY IF EXISTS "Tesserini: Atleti gestiscono propri file" ON storage.objects;
CREATE POLICY "Tesserini: Atleti gestiscono propri file" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'federation-cards' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'federation-cards' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Permetti ai Coach di vedere i tesserini dei propri atleti
DROP POLICY IF EXISTS "Tesserini: Coach vedono tesserini atleti" ON storage.objects;
CREATE POLICY "Tesserini: Coach vedono tesserini atleti" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'federation-cards'
  AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id::text = (storage.foldername(name))[1]
    AND a.coach_id IN (SELECT id FROM public.coaches WHERE email = auth.jwt()->>'email')
  )
);

-- 3. Permetti ai Manager di vedere i tesserini della propria società
DROP POLICY IF EXISTS "Tesserini: Manager vedono tesserini società" ON storage.objects;
CREATE POLICY "Tesserini: Manager vedono tesserini società" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'federation-cards'
  AND EXISTS (
    SELECT 1 FROM public.athletes a
    JOIN public.coaches c ON a.coach_id = c.id
    JOIN public.companies comp ON c.company_id = comp.id
    WHERE a.id::text = (storage.foldername(name))[1]
    AND comp.account_manager_email = auth.jwt()->>'email'
  )
);

-- 4. Permetti il SELECT al Super Admin (Piccolo fix di manutenzione)
DROP POLICY IF EXISTS "Tesserini: Admin vede tutto" ON storage.objects;
CREATE POLICY "Tesserini: Admin vede tutto" ON storage.objects
FOR SELECT TO authenticated
USING (auth.jwt()->>'email' = 'peakswimservice@gmail.com');
