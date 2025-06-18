const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Photo Evidence App Development Environment...\n');

// Function to start a process
function startProcess(name, command, args, cwd) {
  console.log(`📡 Starting ${name}...`);
  
  const process = spawn(command, args, {
    cwd: cwd || '.',
    stdio: 'inherit',
    shell: true
  });

  process.on('error', (error) => {
    console.error(`❌ Error starting ${name}:`, error.message);
  });

  process.on('close', (code) => {
    console.log(`🔚 ${name} process exited with code ${code}`);
  });

  return process;
}

// Start backend server
console.log('🔧 Starting Python Backend...');
const backendProcess = startProcess('Backend', 'python', ['main.py'], './backend');

// Wait a moment for backend to start
setTimeout(() => {
  console.log('\n📱 Starting Expo Development Server...');
  const expoProcess = startProcess('Expo', 'npx', ['expo', 'start'], '.');
  
  expoProcess.on('close', () => {
    console.log('\n🛑 Shutting down development environment...');
    backendProcess.kill();
  });
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
}); 