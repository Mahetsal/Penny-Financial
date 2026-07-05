import fs from 'fs';
import path from 'path';

const fileContent = fs.readFileSync('c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Transactions.jsx', 'utf8');

const varsToCheck = [
  'showConsentModal',
  'consentStep',
  'detectedBanks',
  'mockerBank',
  'mockerDate',
  'mockerAmount',
  'mockerMerchant',
  'mockerBalance',
  'setMockerBank',
  'setShowConsentModal',
  'setConsentStep',
  'handleStartScanConsent',
  'handleConfirmConsent'
];

console.log('=== Checking Declarations in Transactions.jsx ===');
varsToCheck.forEach(v => {
  const hasDeclaration = new RegExp(`(?:const|let|var|function|param|\\bset|\\b)${v}\\b`).test(fileContent);
  const occurrences = (fileContent.match(new RegExp(`\\b${v}\\b`, 'g')) || []).length;
  console.log(`Variable: ${v}`);
  console.log(`- Occurrences: ${occurrences}`);
  
  // Find lines
  const lines = fileContent.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes(v)) {
      console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
  });
  console.log('------------------------------------');
});
