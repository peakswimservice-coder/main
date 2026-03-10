const https = require('https');

// INSERISCI QUI I TUOI DATI PER IL TEST LOCALE
const APP_ID = "d3c0042e-c767-491d-882e-0ebfc879276c";
const REST_API_KEY = "os_v2_app_2paailwhm5er3cbob274q6jhnrzwymnc4slu6k4osxuciza47gbtywg72y5ldwnss5orr7y3uqfwkcuwrw7h5vdsukmgdzekjbyr6hq";

const postData = JSON.stringify({
  app_id: APP_ID,
  included_segments: ["Subscribed Users"],
  contents: { en: "Test locale di connessione" }
});

const options = {
  hostname: 'onesignal.com',
  port: 443,
  path: '/api/v1/notifications',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Key ${REST_API_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log("Inizio test locale...");
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
    if (res.statusCode === 200) {
      console.log(">>> SUCCESS! La chiave è valida.");
    } else {
      console.log(">>> FALLITO. La chiave potrebbe essere scaduta o non valida.");
    }
  });
});

req.on('error', (e) => { console.error("Errore di rete:", e.message); });
req.write(postData);
req.end();
