#!/usr/bin/env node
// Run this to see the URL to enter in Expo Go when the QR code doesn't show.
const os = require('os');

const PORT = process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS ? 8081 : 8081;
let ip = 'YOUR_PC_IP';

try {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address;
        break;
      }
    }
    if (ip !== 'YOUR_PC_IP') break;
  }
} catch (_) {}

const url = `exp://${ip}:${PORT}`;
console.log('');
console.log('  If the QR code is not visible, open Expo Go and enter this URL manually:');
console.log('');
console.log('    ' + url);
console.log('');
console.log('  Make sure your phone is on the same Wi-Fi as this PC.');
console.log('  Metro must be running (npm start or npx expo start --offline) on port ' + PORT + '.');
console.log('');
