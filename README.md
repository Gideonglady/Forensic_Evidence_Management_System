# Photo Evidence App

A mobile application to create cryptographic proof of existence for photos using a blockchain-based Merkle tree.

## Tech Stack

- **Frontend:** React Native (Expo)
- **Backend:** Python (FastAPI)
- **Blockchain:** Ethereum (Solidity, Hardhat)

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- [Python](https://www.python.org/downloads/)
- [Expo Go](https://expo.dev/go) app on your mobile device

## Setup & Installation

1.  **Clone the repository:**
    ```powershell
    git clone <repository-url>
    cd photo-evidence-app
    ```

2.  **Install Frontend Dependencies:**
    ```powershell
    npm install
    ```

3.  **Setup Backend:**
    - Navigate to the backend directory:
      ```powershell
      cd backend
      ```
    - Create a Python virtual environment:
      ```powershell
      python -m venv venv
      ```
    - Activate the virtual environment:
      ```powershell
      .\venv\Scripts\Activate.ps1
      ```
    - Install Python dependencies:
      ```powershell
      pip install -r requirements.txt
      ```
    - Go back to the root directory:
      ```powershell
      cd ..
      ```

4.  **Blockchain Contracts:**
    - The project uses Hardhat for managing the Solidity smart contract. The contract is located in `contracts/MerkleEvidence.sol`.

## Running the Application

1.  **Start the Backend Server:**
    Open a terminal in the project root and run:
    ```powershell
    npm run backend
    ```
    This will start the FastAPI server at `http://127.0.0.1:8000`.

2.  **Start the Frontend (Expo):**
    Open a second terminal in the project root and run:
    ```powershell
    npm start
    ```
    This will start the Metro bundler. Scan the QR code with the Expo Go app on your phone.

## Available Scripts

- `npm start`: Starts the Expo development server.
- `npm run android`: Starts the app on a connected Android device or emulator.
- `npm run ios`: Starts the app on an iOS simulator.
- `npm run web`: Runs the app in a web browser.
- `npm run backend`: Starts the Python backend server.
- `npm run backend:install`: Installs backend Python dependencies.
- `npx hardhat compile`: Compiles the Solidity smart contracts.
- `npx hardhat run scripts/deploy.js --network <network>`: Deploys the contract to the specified network. 