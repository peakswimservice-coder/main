-- 020_cleanup_and_company_updates.sql
-- 1. Aggiorna l'email del referente della società da fnicora@gmail.com a laifesmart@gmail.com
UPDATE companies 
SET account_manager_email = 'laifesmart@gmail.com' 
WHERE account_manager_email = 'fnicora@gmail.com';

-- 2. Elimina eventuali log di allenamenti per il coach che stiamo per rimuovere per evitare violazioni di FK
DELETE FROM training_sessions
WHERE coach_id IN (SELECT id FROM coaches WHERE email = 'laifesmart@gmail.com');

-- 3. Elimina le gare (races) associate al coach che stiamo per rimuovere (il DB schema ha settato ON DELETE CASCADE, ma lo facciamo in modo esplicito per sicurezza)
DELETE FROM races
WHERE coach_id IN (SELECT id FROM coaches WHERE email = 'laifesmart@gmail.com');

-- 4. Assicurati che non ci siano atleti orfani collegati al coach specifico che stiamo per rimuovere
-- Le policy potrebbero bloccare l'accesso se non lo facciamo prima del CASCADE
DELETE FROM athlete_leg_points
WHERE athlete_id IN (SELECT id FROM athletes WHERE coach_id IN (SELECT id FROM coaches WHERE email = 'laifesmart@gmail.com'));

DELETE FROM athlete_virtual_progress
WHERE athlete_id IN (SELECT id FROM athletes WHERE coach_id IN (SELECT id FROM coaches WHERE email = 'laifesmart@gmail.com'));

DELETE FROM athlete_attendance
WHERE athlete_id IN (SELECT id FROM athletes WHERE coach_id IN (SELECT id FROM coaches WHERE email = 'laifesmart@gmail.com'));

DELETE FROM athletes
WHERE coach_id IN (SELECT id FROM coaches WHERE email = 'laifesmart@gmail.com');

-- 5. Elimina fisicamente il coach errato per pulire il database
DELETE FROM coaches 
WHERE email = 'laifesmart@gmail.com';

-- ==========================================
-- 6. Modifica FK constraint su athletes per DELETE CASCADE future
-- Questo assicura che se si elimina un coach, tutti i suoi atleti (e relativi record a cascata) spariscano in automatico
-- ==========================================
DO $$ 
BEGIN
  -- Trova il nome del constraint FK esistente tra athletes e coaches
  DECLARE
    fk_name text;
  BEGIN
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'athletes' AND kcu.column_name = 'coach_id' AND tc.constraint_type = 'FOREIGN KEY';

    IF fk_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE athletes DROP CONSTRAINT ' || fk_name;
    END IF;

    -- Ricrea il constraint con ON DELETE CASCADE
    ALTER TABLE athletes
    ADD CONSTRAINT athletes_coach_id_fkey
    FOREIGN KEY (coach_id) REFERENCES coaches(id)
    ON DELETE CASCADE;
  END;
END $$;
