import fs from 'fs';
import path from 'path';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('errorboundary') || content.toLowerCase().includes('componentdidcatch') || content.toLowerCase().includes('getderivedstatefromerror')) {
        console.log(`Found reference in: ${fullPath}`);
      }
    }
  });
}

console.log('=== Searching for Error Boundaries ===');
searchDir('c:/Users/AHMAD/Desktop/Karam/frontend/src');
