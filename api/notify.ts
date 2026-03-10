import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { type, coachId, athleteName, athleteId, status, groupName, date, groupId } = req.body;
  const APP_ID = (process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || "").trim();
  const API_KEY = (process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY || "").trim();

  if (!APP_ID || !API_KEY) {
    return res.status(500).json({ error: 'Configurazione OneSignal mancante' });
  }

  let notificationPayload: any = {
    app_id: String(APP_ID),
    headings: { it: "PeakSwim", en: "PeakSwim" },
    contents: { it: "Messaggio da PeakSwim", en: "Message from PeakSwim" }
  };

  if (type === 'join_request') {
    notificationPayload.include_external_user_ids = [coachId];
    notificationPayload.headings.it = "Richiesta di iscrizione";
    notificationPayload.contents.it = `${athleteName} vorrebbe unirsi al tuo team!`;
    notificationPayload.data = { type, athleteName };
  } 
  else if (type === 'status_update') {
    notificationPayload.include_external_user_ids = [athleteId];
    notificationPayload.headings.it = status === 'active' ? "Richiesta approvata!" : "Richiesta non accettata";
    notificationPayload.contents.it = status === 'active' 
      ? `Il coach ti ha accettato nel gruppo ${groupName || ''}!`
      : `Il coach non ha potuto accettare la tua richiesta.`;
    notificationPayload.data = { type, status };
  }
  else {
    // Default: Nuovo Allenamento (Broadcast o per ora role=coach per test)
    notificationPayload.filters = [{ field: "tag", key: "role", relation: "=", value: "coach" }];
    notificationPayload.headings.it = "PeakSwim: Nuovo Allenamento";
    notificationPayload.contents.it = `Nuovo allenamento disponibile per il gruppo ${groupName || ''}! (${date})`;
    notificationPayload.data = { groupId, date };
  }

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
          res.status(200).json(result);
        } else {
          console.error(`OneSignal Error ${osRes.statusCode}:`, body);
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
