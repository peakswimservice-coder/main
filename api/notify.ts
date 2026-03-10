import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';

const API_VERSION = "1.0.6-auto";

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

  if (!APP_ID || !API_KEY) return res.status(500).json({ error: 'Configurazione mancante su Vercel.' });

  const postData = JSON.stringify({
    app_id: APP_ID,
    included_segments: ["Subscribed Users"],
    contents: { it: `Nuovo allenamento per il gruppo ${groupName || 'PeakSwim'}!` },
    headings: { it: "PeakSwim: Nuovo Allenamento" },
    data: { groupId, date }
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

  const prefixes = ['Key', 'Basic', 'Bearer'];
  let lastResult: any = null;

  for (const prefix of prefixes) {
    console.log(`[v${API_VERSION}] Attempting with prefix: ${prefix}`);
    const options = {
      ...baseOptions,
      headers: { ...baseOptions.headers, 'Authorization': `${prefix} ${API_KEY}` }
    };
    
    const result = await tryOneSignal(options, postData);
    lastResult = result;
    
    if (result.success) {
      console.log(`[v${API_VERSION}] Success with prefix: ${prefix}`);
      return res.status(200).json({ ...JSON.parse(result.body), _used_prefix: prefix, _v: API_VERSION });
    }
    console.warn(`[v${API_VERSION}] Failed with prefix ${prefix}: ${result.status}`);
  }

  // Se arriviamo qui, hanno fallito tutti
  return res.status(lastResult.status || 500).json({ 
    ...JSON.parse(lastResult.body || '{}'), 
    _debug: "All prefixes failed", 
    _v: API_VERSION 
  });
}
