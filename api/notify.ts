import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { type, coachId, athleteName, athleteId, status, groupName, date, groupId, raceName } = req.body;
  const APP_ID = (process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || "").trim();
  const API_KEY = (process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY || "").trim();

  console.log(`OS_DEBUG: Config - AppID: ${APP_ID.substring(0, 8)}..., Key: ${API_KEY.substring(0, 10)}... (len: ${API_KEY.length})`);

  if (!APP_ID || !API_KEY) {
    return res.status(500).json({ error: 'Configurazione OneSignal mancante' });
  }

  let notificationPayload: any = {
    app_id: String(APP_ID),
    headings: { it: "PeakSwim", en: "PeakSwim" },
    contents: { it: "Messaggio da PeakSwim", en: "Message from PeakSwim" }
  };

  if (type === 'join_request') {
    notificationPayload.include_external_user_ids = [String(coachId)];
    notificationPayload.headings.it = "Richiesta di iscrizione";
    notificationPayload.contents.it = `${athleteName} vorrebbe unirsi al tuo team!`;
    notificationPayload.data = { type, athleteName };
  } 
  else if (type === 'status_update') {
    notificationPayload.include_external_user_ids = [String(athleteId)];
    notificationPayload.headings.it = status === 'active' ? "Richiesta approvata!" : "Richiesta non accettata";
    notificationPayload.contents.it = status === 'active' 
      ? `Il coach ti ha accettato nel gruppo ${groupName || ''}!`
      : `Il coach non ha potuto accettare la tua richiesta.`;
    notificationPayload.data = { type, status };
  }
  else if (type === 'race_update') {
    if (!groupId) {
      return res.status(400).json({ error: 'groupId mancante per notifica gara' });
    }

    const { data: athletes, error: athleteError } = await supabase
      .from('athletes')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'active');

    const athleteIds = (athletes || []).map(a => String(a.id));

    if (athleteIds.length === 0) {
      return res.status(200).json({ message: "Nessun atleta da notificare" });
    }

    notificationPayload.include_external_user_ids = athleteIds;
    notificationPayload.headings.it = "PeakSwim: Nuova Gara / Modifica";
    notificationPayload.contents.it = `Aggiornamento calendario: ${raceName} (${date}) per il gruppo ${groupName || ''}.`;
    notificationPayload.data = { groupId, date, type };
  }
  else {
    // Default: Nuovo Allenamento. Target: Atleti del gruppo
    if (!groupId) {
       return res.status(400).json({ error: 'groupId mancante per notifica allenamento' });
    }

    // Recupera tutti gli ID degli atleti nel gruppo
    const { data: athletes, error: athleteError } = await supabase
      .from('athletes')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (athleteError) {
      console.error("Error fetching group athletes:", athleteError);
    }

    const athleteIds = (athletes || []).map(a => String(a.id));

    if (athleteIds.length === 0) {
      console.log(`OS_DEBUG: Nessun atleta trovato per il gruppo ${groupId}`);
      return res.status(200).json({ message: "Nessun atleta da notificare" });
    }

    notificationPayload.include_external_user_ids = athleteIds;
    notificationPayload.headings.it = "PeakSwim: Nuovo Allenamento";
    notificationPayload.contents.it = `Nuovo allenamento pronto per il gruppo ${groupName || ''}! (${date})`;
    notificationPayload.data = { groupId, date };
    console.log(`OS_DEBUG: Invio notifica "Nuovo Allenamento" a ${athleteIds.length} atleti.`);
  }

  console.log("OS_DEBUG: Sending payload to OneSignal:", JSON.stringify(notificationPayload, null, 2));

  const postData = JSON.stringify(notificationPayload);

  const options = {
    hostname: 'onesignal.com',
    port: 443,
    path: '/api/v1/notifications',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Key ${API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const osReq = https.request(options, (osRes) => {
      let body = '';
      osRes.on('data', (chunk) => { body += chunk; });
      osRes.on('end', () => {
        let result = {};
        try { result = JSON.parse(body || '{}'); } catch(e) {}
        
        if (osRes.statusCode && osRes.statusCode >= 200 && osRes.statusCode < 300) {
          console.log(`OS_DEBUG: OneSignal Success (${osRes.statusCode}):`, body);
          res.status(200).json(result);
        } else {
          console.error(`OS_DEBUG: OneSignal Error ${osRes.statusCode}:`, body);
          res.status(osRes.statusCode || 500).json(result);
        }
        resolve(true);
      });
    });

    osReq.on('error', (e) => {
      console.error("OS Request Error:", e);
      res.status(500).json({ error: e.message });
      resolve(false);
    });

    osReq.write(postData);
    osReq.end();
  });
}
