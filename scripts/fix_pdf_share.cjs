const fs = require('fs');
const filePath = './src/components/TrainingPlan.tsx';
let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Use positional approach: find canShare -> find 'condivisione del PDF.")'
const si = c.indexOf('       const canShare = navigator.canShare');
const endStr = 'condivisione del PDF.");';
const ei = c.indexOf(endStr, si) + endStr.length;

if (si === -1) { console.log('Start not found'); process.exit(1); }
if (ei < si) { console.log('End not found'); process.exit(1); }

console.log('Replacing chars', si, 'to', ei);

const before = c.substring(0, si);
const after = c.substring(ei);

const q = "'";
const dq = '"';
const newBlock = 
'       // Try native share (iOS/Android), fall back to download\n' +
'       let shared = false;\n' +
'       try {\n' +
'         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {\n' +
'           await navigator.share({ title: ' + q + 'Programma Allenamento' + q + ', files: [file] });\n' +
'           shared = true;\n' +
'         }\n' +
'       } catch (shareErr) {\n' +
'         if (shareErr.name === ' + q + 'AbortError' + q + ') shared = true;\n' +
'         else console.warn(' + q + 'Share failed:' + q + ', shareErr);\n' +
'       }\n' +
'       if (!shared) {\n' +
'         const url = URL.createObjectURL(pdfBlob);\n' +
"         const a = document.createElement('a');\n" +
'         a.href = url;\n' +
'         a.download = filename;\n' +
'         document.body.appendChild(a);\n' +
'         a.click();\n' +
'         document.body.removeChild(a);\n' +
'         setTimeout(function() { URL.revokeObjectURL(url); }, 1000);\n' +
'       }\n' +
'     } catch (e) {\n' +
'        var msg = (e && e.message) ? e.message : String(e);\n' +
"        console.error('PDF error:', msg);\n" +
"        alert('Errore nella generazione del PDF: ' + msg);";

fs.writeFileSync(filePath, before + newBlock + after, 'utf8');
console.log('SUCCESS');
