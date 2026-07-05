const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('===================================================');
console.log('   PENNY (KARAM FINANCIAL) SERVER & TUNNEL BOOTER  ');
console.log('===================================================');

// 1. Start the dev servers (backend + client) concurrently
console.log('\n[1/3] Booting Vite client and Express server...');
const devProcess = spawn('npm.cmd', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Clean up child processes on exit
process.on('SIGINT', () => {
  devProcess.kill();
  process.exit();
});

// 2. Search for the cloudflared binary in the current directory (handling typos/double extensions)
let cloudflaredCmd = 'cloudflared'; // Default fallback (system path)

const possibleNames = [
  'cloudflared.exe',
  'cloudflared.exe.exe',
  'cloudflared-windows-amd64.exe',
  'cloudflared'
];

for (const name of possibleNames) {
  const fullPath = path.join(__dirname, '..', name);
  if (fs.existsSync(fullPath)) {
    cloudflaredCmd = fullPath;
    console.log(`[System] Found local cloudflared binary: ${name}`);
    break;
  }
}

// 3. Start Cloudflare Tunnel
console.log('[2/3] Launching Cloudflare Quick Tunnel...');
const tunnelProcess = spawn(`"${cloudflaredCmd}"`, ['tunnel', '--url', 'http://127.0.0.1:5173'], {
  cwd: path.join(__dirname, '..'),
  shell: true
});

let urlFound = false;

tunnelProcess.stdout.on('data', handleTunnelData);
tunnelProcess.stderr.on('data', handleTunnelData);

function handleTunnelData(data) {
  const output = data.toString();
  
  if (!urlFound) {
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      urlFound = true;
      const url = match[0];
      
      console.log('\n===================================================');
      console.log('🎉 CLOUDFLARE QUICK TUNNEL ACTIVE!');
      console.log(`🔗 Public URL: ${url}`);
      console.log('===================================================');
      console.log('\nOpening the link in your default browser...');
      
      // Open in default browser
      const openCommand = process.platform === 'win32' ? `start ${url}` : `open ${url}`;
      exec(openCommand, (err) => {
        if (err) {
          console.error('Failed to open browser automatically:', err.message);
        }
      });
    }
  }
}

tunnelProcess.on('close', (code) => {
  if (code !== 0 && !urlFound) {
    console.log(`\nCloudflare tunnel process exited with code ${code}`);
    console.log('If you get this error, please check that you have copied cloudflared.exe to the project folder.');
  }
});

tunnelProcess.on('error', (err) => {
  console.error('\n❌ ERROR starting cloudflared:', err.message);
  console.log('Please ensure cloudflared is installed and available in your PATH or project folder.');
});
