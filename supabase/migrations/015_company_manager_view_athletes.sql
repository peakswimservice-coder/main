-- 15. Permetti ai Manager delle Società e agli Admin di vedere gli atleti
-- Questo risolve il bug per cui i manager vedevano i coach ma non la lista dei loro atleti.

-- 1. Permetti il SELECT ai Manager delle Società
-- Un manager può vedere gli atleti assegnati ai coach della propria società
DROP POLICY IF EXISTS "company_manager_select_athletes" ON athletes;
CREATE POLICY "company_manager_select_athletes" ON athletes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coaches
    JOIN companies ON companies.id = coaches.company_id
    WHERE coaches.id = athletes.coach_id
    AND companies.account_manager_email = auth.jwt()->>'email'
  )
);

-- 2. Permetti il SELECT al Super Admin
DROP POLICY IF EXISTS "admin_select_athletes" ON athletes;
CREATE POLICY "admin_select_athletes" ON athletes
FOR SELECT TO authenticated
USING (auth.jwt()->>'email' = 'peakswimservice@gmail.com');
