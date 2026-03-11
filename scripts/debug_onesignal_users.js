const https = require('https');

// Keys from test_onesignal.js
const APP_ID = "d3c0042e-c767-491d-882e-0ebfc879276c";
const REST_API_KEY = "os_v2_app_2paailwhm5er3cbob274q6jhnrzwymnc4slu6k4osxuciza47gbtywg72y5ldwnss5orr7y3uqfwkcuwrw7h5vdsukmgdzekjbyr6hq";

const options = {
  hostname: 'onesignal.com',
  port: 443,
  path: `/api/v1/players?app_id=${APP_ID}&limit=50&offset=0`,
  method: 'GET',
  headers: {
    'Authorization': `Key ${REST_API_KEY}`
  }
};

console.log("Recupero lista utenti da OneSignal...");
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      const data = JSON.parse(body);
      console.log(`\nTROVATI ${data.players.length} UTENTI REGISTRATI:`);
      console.log("------------------------------------------");
      data.players.forEach((p, i) => {
        console.log(`${i + 1}. ID Esterno: ${p.external_user_id || 'NON IMPOSTATO'}`);
        console.log(`   Player ID OneSignal: ${p.id}`);
        console.log(`   Sottoscritto: ${p.invalid_identifier ? 'NO (Errore)' : (p.notification_types > 0 ? 'SI' : 'NO')}`);
        console.log(`   Ultima sessione: ${new Date(p.last_active * 1000).toLocaleString()}`);
        if (p.tags) console.log(`   Tags: ${JSON.stringify(p.tags)}`);
        console.log("------------------------------------------");
      });
    } else {
      console.error(`ERRORE: ${res.statusCode}`);
      console.error(body);
    }
  });
});

req.on('error', (e) => { console.error("Errore di rete:", e.message); });
req.end();
