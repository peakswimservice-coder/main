import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';

const API_VERSION = "1.0.8-debug";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { groupId, groupName, date } = req.body;
  const APP_ID = (process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || "").trim();
  const API_KEY = (process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY || "").trim();

  // Logging diagnostico spinto
  console.log(`[v${API_VERSION}] DEBUG API: AppId Length=${APP_ID.length}, Key Length=${API_KEY.length}`);
  console.log(`[v${API_VERSION}] AppId start: ${APP_ID.substring(0, 5)}... end: ${APP_ID.slice(-5)}`);

  if (!APP_ID || !API_KEY) {
    return res.status(500).json({ 
      error: `Configurazione mancante: AppID(${APP_ID ? 'OK' : 'MISSING'}), Key(${API_KEY ? 'OK' : 'MISSING'})`,
      _v: API_VERSION
    });
  }

  const postData = JSON.stringify({
    app_id: String(APP_ID),
    included_segments: ["Subscribed Users"],
    contents: { it: `Test PeakSwim v${API_VERSION}` }
  });

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
        
        const enhancedResult = { ...result, _v: API_VERSION, _status: osRes.statusCode };

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
      res.status(500).json({ error: e.message, _v: API_VERSION });
      resolve(false);
    });

    osReq.write(postData);
    osReq.end();
  });
}
