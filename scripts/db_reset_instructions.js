const { createClient } = require('@supabase/supabase-js');

// We need the service role key or a way to bypass RLS to see everything
// Since I don't have it, I'll ask the user to check their Supabase dashboard
// OR I'll try to use the public key if RLS allows listing (unlikely for all data)

console.log("--- ISPEZIONE DATABASE ---");
console.log("Per favore, esegui questa query nel SQL Editor di Supabase per vedere la situazione reale:");
console.log(`
SELECT 'COACH' as type, id, email, full_name, invite_code FROM coaches;
SELECT 'ATHLETE' as type, id, email, full_name, coach_id, status FROM athletes;
SELECT 'SUBSCRIPTION' as type, user_id, token FROM push_subscriptions;
`);

console.log("\n--- SCRIPT DI RESET (DA ESEGUIRE IN SUPABASE) ---");
console.log("Copia e incolla questo se vuoi ricominciare da zero:");
console.log(`
-- Attenzione: questo cancella i dati di test
TRUNCATE TABLE push_subscriptions;
TRUNCATE TABLE athletes CASCADE;
-- SE VUOI RESETTARE ANCHE I COACH:
-- TRUNCATE TABLE coaches CASCADE;
`);
