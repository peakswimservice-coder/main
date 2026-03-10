import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { groupId, groupName, sessionType, date } = req.body;

  const ONESIGNAL_APP_ID = (process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID)?.trim();
  const ONESIGNAL_REST_API_KEY = (process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY)?.trim();

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error("Missing credentials:", { appId: !!ONESIGNAL_APP_ID, apiKey: !!ONESIGNAL_REST_API_KEY });
    return res.status(500).json({ error: 'Configurazione OneSignal mancante sull\'ambiente (VITE_ONESIGNAL_APP_ID / VITE_ONESIGNAL_REST_API_KEY)' });
  }

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
