# Photo Evidence App

A secure mobile application built with React Native and Expo for capturing, storing, and managing photo evidence with enhanced security features.

## Features

- 📸 Capture photos with device camera
- 🔒 Secure storage of photo evidence
- 📁 Document management and organization
- 🔐 Encryption for sensitive data
- 📱 Cross-platform support (iOS & Android)
- 🎯 User-friendly interface

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Python 3.8 or higher
- pip (Python package manager)
- iOS Simulator (for Mac users) or Android Studio (for Android development)

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd photo-evidence-app
```

2. Backend Setup:
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (recommended)
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Create .env file from example
cp env.example .env
# Edit .env file with your configuration
```

3. Frontend Setup:
```bash
# Navigate back to root directory
cd ..

# Install frontend dependencies
npm install
# or
yarn install
```

## Running the Application

The application requires both backend and frontend to be running simultaneously. You'll need two terminal windows:

### Terminal 1 - Backend Server
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment if not already activated
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Start the backend server
uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend Development
```bash
# Navigate to root directory
cd photo-evidence-app

# Start the Expo development server
npm start
# or
yarn start
```

The backend will be running on `http://localhost:8000` and the frontend will be available through Expo's development server.

## Project Structure

```
photo-evidence-app/
├── app/                 # Main application code
├── assets/             # Static assets (images, fonts)
├── components/         # Reusable React components
├── constants/          # App constants and configuration
├── hooks/             # Custom React hooks
├── backend/           # Backend server code
│   ├── main.py        # FastAPI application
│   ├── requirements.txt # Python dependencies
│   └── uploads/       # Upload directory for images
└── scripts/           # Utility scripts
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start the app on Android emulator
- `npm run ios` - Start the app on iOS simulator
- `npm run web` - Start the app in web browser

## Dependencies

### Core Dependencies
- expo: ^53.0.11
- react: ^19.0.0
- react-native: ^0.79.3
- @expo/vector-icons: ^14.1.0

### Security & Storage
- expo-crypto: ~14.1.5
- expo-file-system: ~18.1.10
- crypto-js: ^4.1.1

### Media Handling
- expo-image-picker: ~16.1.4
- expo-document-picker: ~13.1.5

## Development

### Environment Setup
1. Create a `.env` file in the root directory
2. Add necessary environment variables:
```
API_URL=your_api_url
ENCRYPTION_KEY=your_encryption_key
```

### Code Style
This project uses ESLint for code linting. Run the linter with:
```bash
npm run lint
```

## Security Features

- End-to-end encryption for stored photos
- Secure file system access
- Permission-based access control
- Secure data transmission

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email [your-email] or open an issue in the repository.

## Acknowledgments

- Expo team for the amazing framework
- React Native community
- All contributors who have helped shape this project
