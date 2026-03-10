import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { groupId, groupName, sessionType, date } = req.body;

  const ONESIGNAL_APP_ID = (process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID)?.trim();
  const ONESIGNAL_REST_API_KEY = (process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY)?.trim();

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    const missing = [];
    if (!ONESIGNAL_APP_ID) missing.push("APP_ID");
    if (!ONESIGNAL_REST_API_KEY) missing.push("REST_API_KEY");
    return res.status(500).json({ 
      error: `Configurazione mancante su Vercel: ${missing.join(', ')}. Verifica le Environment Variables.` 
    });
  }

  // Diagnostic logging (visible in Vercel Logs)
  console.log(`OS_DEBUG: AppId=${ONESIGNAL_APP_ID.substring(0,6)}... (${ONESIGNAL_APP_ID.length} chars)`);
  console.log(`OS_DEBUG: Key=${ONESIGNAL_REST_API_KEY.substring(0,10)}...${ONESIGNAL_REST_API_KEY.slice(-5)} (${ONESIGNAL_REST_API_KEY.length} chars)`);

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],
        contents: { 
          it: `Nuovo allenamento per il gruppo ${groupName}!`,
          en: `New training for group ${groupName}!` 
        },
        headings: { 
          it: "PeakSwim: Nuovo Allenamento",
          en: "PeakSwim: New Training" 
        },
        data: { 
          groupId,
          date
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Serverless Function Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
