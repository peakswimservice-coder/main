import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';

const API_VERSION = "1.0.7-debug";

async function tryOneSignal(options: https.RequestOptions, postData: string): Promise<{ success: boolean; status?: number; body: string }> {
  return new Promise((resolve) => {
    const osReq = https.request(options, (osRes) => {
      let body = '';
      osRes.on('data', (chunk) => { body += chunk; });
      osRes.on('end', () => {
        resolve({ 
          success: !!(osRes.statusCode && osRes.statusCode >= 200 && osRes.statusCode < 300),
          status: osRes.statusCode,
          body
        });
      });
    });
    osReq.on('error', (e) => resolve({ success: false, body: e.message }));
    osReq.write(postData);
    osReq.end();
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { groupId, groupName, date } = req.body;
  const APP_ID = (process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID)?.trim();
  const API_KEY = (process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY)?.trim();

  if (!APP_ID || !API_KEY) return res.status(500).json({ error: 'Configurazione mancante.' });

  // Body minimale per escludere problemi di validazione schema
  const postData = JSON.stringify({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    contents: { en: `PeakSwim Test v${API_VERSION}` }
  });

  const baseOptions = {
    hostname: 'onesignal.com',
    port: 443,
    path: '/api/v1/notifications',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // Proviamo TUTTE le combinazioni possibili
  const authVariants = [
    `Key ${API_KEY}`,
    `Basic ${API_KEY}`,
    `Bearer ${API_KEY}`,
    API_KEY,
    `Key=${API_KEY}`,
    `token=${API_KEY}`
  ];

  let lastResult: any = null;

  for (const authHeader of authVariants) {
    const displayHeader = authHeader.substring(0, 15) + "...";
    console.log(`[v${API_VERSION}] Prova con: ${displayHeader}`);
    
    const options = {
      ...baseOptions,
      headers: { ...baseOptions.headers, 'Authorization': authHeader }
    };
    
    const result = await tryOneSignal(options, postData);
    lastResult = result;
    
    if (result.success) {
      console.log(`[v${API_VERSION}] SUCCESSO con: ${displayHeader}`);
      return res.status(200).json({ ...JSON.parse(result.body), _used: displayHeader, _v: API_VERSION });
    }
    console.warn(`[v${API_VERSION}] FALLITO (${result.status}) con: ${displayHeader}`);
  }

  return res.status(lastResult.status || 500).json({ 
    ...JSON.parse(lastResult.body || '{}'), 
    _debug: "Tutte le varianti hanno fallito", 
    _v: API_VERSION 
  });
}
