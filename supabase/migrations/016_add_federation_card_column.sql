-- 16. Aggiungi colonna per il tesserino federale
-- Permette agli atleti di caricare un URL (Supabase Storage) del proprio tesserino.

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS federation_card_url TEXT;

-- Assicurati che le RLS esistenti permettano la lettura/scrittura della nuova colonna
-- (Le policy ALL o UPDATE su athletes coprono già questa aggiunta per l'atleta stesso)
