# Photo Evidence App

A React Native mobile application for capturing, processing, and storing photo evidence with blockchain integration.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- Expo CLI
- Android Studio / Xcode (for mobile development)

### Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Python backend dependencies:**
   ```bash
   npm run backend:install
   ```

3. **Start the development environment:**
   ```bash
   npm run dev
   ```

This will start both the Python backend server and the Expo development server.

## 📱 App Features

- **Photo Capture**: Take photos using device camera
- **Photo Selection**: Choose photos from device gallery
- **Case Management**: Organize evidence by case numbers
- **Backend Processing**: Upload and process photos on Python backend
- **Blockchain Storage**: Store photo hashes on blockchain (mock for development)
- **Evidence Retrieval**: Retrieve and verify stored evidence

## 🏗️ Project Structure

```
photo-evidence-app/
├── app/                    # Main application code
├── backend/               # Python FastAPI backend
│   ├── main.py           # Backend server
│   ├── blockchain.py     # Blockchain integration
│   └── requirements.txt  # Python dependencies
├── components/           # Reusable React components
├── constants/           # App constants and configurations
├── contracts/          # Smart contracts (Solidity)
├── scripts/            # Utility scripts
├── App.js              # Main app component
└── package.json        # Node.js dependencies
```

## 🔧 Configuration

### Backend Configuration
The backend runs on `http://192.168.253.55:8000` by default. Update the `API_BASE_URL` in `App.js` if needed.

### Blockchain Configuration
For development, the app uses mock blockchain storage. In production, update the blockchain configuration in `constants/blockchain.js`.

## 🐛 Troubleshooting

### Current Status ✅
- **Backend**: Running and healthy on `http://192.168.0.4:8000`
- **ImagePicker**: Fixed and working correctly
- **Network Requests**: Configured for mobile device access

### Common Issues

1. **ImagePicker API Usage**
   - ✅ Fixed: Using `ImagePicker.MediaTypeOptions.Images` (correct API for expo-image-picker v16.1.4)
   - Note: `MediaType.Images` is not available in this version

2. **Backend Network Request Failed**
   - ✅ Fixed: Updated API URL to use computer's IP address (`192.168.0.4`)
   - ✅ Fixed: Added proper error handling and mock data fallback
   - ✅ Fixed: Backend is running and accessible

3. **Blockchain 401 Errors**
   - ✅ Fixed: Replaced with mock blockchain storage for development
   - In production, configure proper blockchain endpoints

4. **Package Compatibility Issues**
   - ✅ Fixed: Updated all packages to compatible versions for Expo SDK 53

5. **Backend Already Running Error**
   - ✅ Normal: Backend is already running on port 8000
   - Use `npm run backend:status` to check status
   - Use `npm run backend:test` to test connectivity

### Development Commands

```bash
# Check backend status
npm run backend:status

# Test backend connectivity
npm run backend:test

# Start both backend and frontend
npm run dev

# Start only the backend (if not already running)
npm run backend

# Start only the frontend
npm start

# Install backend dependencies
npm run backend:install
```

## 🔒 Security Features

- Photo hashing using SHA-256
- Blockchain-based evidence storage
- Secure file upload handling
- Permission-based camera and gallery access

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions, please check the troubleshooting section above or create an issue in the repository.
