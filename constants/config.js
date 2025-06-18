// Configuration for the Photo Evidence App
export const CONFIG = {
  // Backend API Configuration
  API_BASE_URL: "http://192.168.253.55:8000",
  
  // Fallback URLs for different network scenarios
  FALLBACK_URLS: [
    "http://192.168.253.55:8000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
  ],
  
  // Blockchain Configuration (for development, using mock)
  BLOCKCHAIN_API_URL: "http://localhost:8545",
  
  // App Configuration
  APP_NAME: "Photo Evidence App",
  VERSION: "1.0.0",
  
  // Development Settings
  DEBUG_MODE: true,
  USE_MOCK_BLOCKCHAIN: true,
  
  // Network Timeouts
  REQUEST_TIMEOUT: 30000, // 30 seconds
  
  // File Upload Settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  
  // Security Settings
  HASH_ALGORITHM: 'SHA256',
};

// Helper function to get the correct API URL based on environment
export const getApiUrl = () => {
  return CONFIG.API_BASE_URL;
};

// Helper function to check if backend is accessible with fallback URLs
export const checkBackendHealth = async () => {
  for (const url of CONFIG.FALLBACK_URLS) {
    try {
      console.log(`Trying backend URL: ${url}`);
      const response = await fetch(`${url}/`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        console.log(`Backend is accessible at: ${url}`);
        // Update the main API URL to the working one
        CONFIG.API_BASE_URL = url;
        return true;
      }
    } catch (error) {
      console.log(`Failed to connect to ${url}:`, error.message);
      continue;
    }
  }
  
  console.error('All backend URLs failed');
  return false;
}; 