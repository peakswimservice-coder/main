const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../src/components/TrainingPlan.tsx');

let content = fs.readFileSync(filePath, 'utf8');
// normalize line endings
content = content.replace(/\r\n/g, '\n');

const oldBlock = `       const file = new File([pdfBlob], filename, { type: 'application/pdf' });
       const canShare = navigator.canShare && navigator.canShare({ files: [file] });

       if (canShare) {
         await navigator.share({ title: 'Programma Allenamento', files: [file] });
       } else {
         const url = URL.createObjectURL(pdfBlob);
         const a = document.createElement('a');
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
       }
     } catch (e) {
        console.error("PDF Share Error:", e);
        alert("Errore durante la generazione o la condivisione del PDF.");`;

const newBlock = `       const file = new File([pdfBlob], filename, { type: 'application/pdf' });

       // Try native share (iOS/Android), fall back to download
       let shared = false;
       try {
         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
           await navigator.share({ title: 'Programma Allenamento', files: [file] });
           shared = true;
         }
       } catch (shareErr) {
         // AbortError = user dismissed the share dialog - not a real error
         if (shareErr.name === 'AbortError') shared = true;
         else console.warn('Share failed, falling back to download:', shareErr);
       }

       if (!shared) {
         const url = URL.createObjectURL(pdfBlob);
         const a = document.createElement('a');
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         setTimeout(() => URL.revokeObjectURL(url), 1000);
       }
     } catch (e) {
        console.error('PDF generation error:', e && e.message ? e.message : e);
        alert('Errore nella generazione del PDF: ' + (e && e.message ? e.message : 'errore sconosciuto'));`;

if (content.includes(oldBlock)) {
  const result = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, result, 'utf8');
  console.log('SUCCESS: PDF share block replaced.');
} else {
  console.log('BLOCK NOT FOUND. Searching for key parts...');
  console.log('canShare found:', content.includes('const canShare = navigator.canShare'));
  console.log('PDF Share Error found:', content.includes('PDF Share Error'));
}
