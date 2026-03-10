import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { groupId, groupName, date } = req.body;

  const ONESIGNAL_APP_ID = (process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID)?.trim();
  const ONESIGNAL_REST_API_KEY = (process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY)?.trim();

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return res.status(500).json({ error: 'Configurazione OneSignal mancante. Verifica le chiavi su Vercel.' });
  }

  const postData = JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Subscribed Users"],
    contents: { 
      it: `Nuovo allenamento per il gruppo ${groupName || 'PeakSwim'}!`,
      en: `New training for group ${groupName || 'PeakSwim'}!` 
    },
    headings: { 
      it: "PeakSwim: Nuovo Allenamento",
      en: "PeakSwim: New Training" 
    },
    data: { groupId, date }
  });

  const options = {
    hostname: 'onesignal.com',
    port: 443,
    path: '/api/v1/notifications',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const API_VERSION = "1.0.5-api";

  return new Promise((resolve) => {
    const osReq = https.request(options, (osRes) => {
      let body = '';
      osRes.on('data', (chunk) => { body += chunk; });
      osRes.on('end', () => {
        let result = {};
        try { result = JSON.parse(body || '{}'); } catch(e) {}
        
        // Aggiungiamo metadati di debug nel risultato
        const enhancedResult = { ...result, _api_version: API_VERSION, _status: osRes.statusCode };

        if (osRes.statusCode && osRes.statusCode >= 200 && osRes.statusCode < 300) {
          res.status(200).json(enhancedResult);
        } else {
          console.error(`OneSignal Error ${osRes.statusCode}:`, body);
          res.status(osRes.statusCode || 500).json(enhancedResult);
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
