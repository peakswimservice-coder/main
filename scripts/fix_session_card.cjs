const fs = require('fs');
const p = './src/components/Dashboard.tsx';
let c = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const marker = 'todaySessions.map((session) =>';
const idx = c.indexOf(marker);
if (idx === -1) { console.log('marker not found'); process.exit(1); }

// Find the div tag after it
const divStart = c.indexOf('<div', idx);
const divEnd = c.indexOf('>', divStart) + 1;
const oldDiv = c.substring(divStart, divEnd);
console.log('Old div:', JSON.stringify(oldDiv));

// Build new div
const newDiv = [
  '<div ',
  '                   key={session.id} ',
  "                   style={{ borderLeftColor: session.groups?.color || '#e2e8f0' }}",
  '                   className="p-4 rounded-2xl border border-l-4 bg-white shadow-sm transition-all hover:shadow-md"',
  '                 >'
].join('\n');

const result = c.substring(0, divStart) + newDiv + c.substring(divEnd);
fs.writeFileSync(p, result, 'utf8');
console.log('SUCCESS');
