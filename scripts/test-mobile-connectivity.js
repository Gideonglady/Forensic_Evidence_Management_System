const fetch = require('node-fetch');

async function testMobileConnectivity() {
  console.log('📱 Testing Mobile Device Connectivity...\n');
  
  const testUrls = [
    'http://192.168.0.4:8000/',
    'http://localhost:8000/',
    'http://127.0.0.1:8000/'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url, { 
        method: 'GET',
        timeout: 5000 
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${url}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data)}`);
      } else {
        console.log(`⚠️  PARTIAL: ${url} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ FAILED: ${url}`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('📋 Recommendations:');
  console.log('1. If localhost works but IP doesn\'t, check firewall settings');
  console.log('2. If IP works but localhost doesn\'t, that\'s expected for mobile devices');
  console.log('3. If none work, check if backend is running and accessible');
}

testMobileConnectivity().catch(console.error); 