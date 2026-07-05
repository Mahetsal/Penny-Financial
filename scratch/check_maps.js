import fs from 'fs';
import path from 'path';

const componentsDir = 'c:/Users/AHMAD/Desktop/Karam/frontend/src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.jsx'));

console.log('=== Checking for .map() key props ===');

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all .map( call sites
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('.map(') && !line.includes('key=')) {
      // Print the line and a few lines after it to see if key is there
      console.log(`File: ${file}:${index + 1}`);
      console.log(`Line: ${line.trim()}`);
      // Print next 3 lines
      for (let i = 1; i <= 3; i++) {
        if (lines[index + i]) {
          console.log(`  +${i}: ${lines[index + i].trim()}`);
        }
      }
      console.log('--------------------------------------------');
    }
  });
});
