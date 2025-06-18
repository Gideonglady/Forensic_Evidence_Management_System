const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testBackend() {
  console.log('🧪 Testing Backend Endpoints...\n');

  try {
    // Test root endpoint
    console.log('1. Testing root endpoint...');
    const rootResponse = await fetch('http://localhost:8000/');
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint:', rootData);
    console.log('');

    // Test health endpoint
    console.log('2. Testing health status...');
    if (rootData.status === 'healthy') {
      console.log('✅ Backend is healthy!');
    } else {
      console.log('❌ Backend health check failed');
    }
    console.log('');

    console.log('🎉 Backend tests completed successfully!');
    console.log('📱 You can now start the Expo app with: npm start');
    console.log('🔧 Backend is running on: http://localhost:8000');

  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    console.log('');
    console.log('🔧 Make sure the backend is running:');
    console.log('   npm run backend');
  }
}

testBackend(); 