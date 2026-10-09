# Forensic Evidence Management System

A mobile application for managing digital evidence, organizing forensic cases, generating evidence hashes, and recording Merkle roots on a blockchain.

## Overview

I built this project to explore how digital evidence can be organized and its integrity verified using cryptographic hashing and blockchain technology.

The system combines a React Native mobile application with a FastAPI backend and a Solidity smart contract. Evidence files and case information are stored locally by the backend, while cryptographic hashes and Merkle roots provide a way to check whether evidence has changed.

The project focuses on the evidence management workflow, file integrity, and blockchain integration. It is a development project, not a certified forensic platform, and should not be used to manage real investigative evidence without additional security and operational controls.


## Features

The repository implements the following areas of functionality. Individual workflows should be tested against the current configuration before being treated as production-ready.

- **Case management:** Store and retrieve forensic case information through the backend.
- **Evidence handling:** Upload evidence files and retain them in the backend's upload directory.
- **Cryptographic hashing:** Generate hashes for evidence-related integrity checks.
- **Merkle trees:** Maintain Merkle-tree data and calculate roots from evidence hashes.
- **Blockchain integration:** Interact with a Solidity smart contract to record evidence-related hashes or Merkle roots.
- **Mobile interface:** Access the application's evidence management workflows through a React Native and Expo application.
- **Photo processing endpoint:** Provide a backend endpoint for photo-processing operations. Some returned metadata is currently mocked rather than extracted from the image.

The exact availability of each workflow depends on the backend configuration, contract deployment, and network connectivity.

## Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Mobile application UI |
| Expo | Mobile development and application tooling |
| JavaScript | Mobile application logic |
| Python | Backend implementation |
| FastAPI | HTTP API |
| Uvicorn | ASGI server |
| JSON files | Local persistence for case and Merkle-tree data |
| Solidity | Smart contract implementation |
| Hardhat | Smart contract development and compilation |
| Ethereum-compatible network | Blockchain interaction |
| Cryptographic hashing | Evidence integrity checks |
| Merkle trees | Aggregation of evidence hashes into a root |

Exact dependency versions should be taken from the repository's package manifests and lockfiles. Verify them against the installed environment before documenting a supported version matrix.

## Architecture

The application separates the mobile interface, backend processing, local persistence, and blockchain interaction.

```text
┌──────────────────────────────┐
│    React Native / Expo App   │
│                              │
│ Case and evidence workflows  │
└──────────────┬───────────────┘
               │ HTTP requests
               ▼
┌──────────────────────────────┐
│       FastAPI Backend        │
│                              │
│ Case and evidence handling   │
│ Hashing and Merkle operations│
│ Blockchain interaction      │
└───────┬───────────┬──────────┘
        │           │
        ▼           ▼
┌──────────────┐  ┌────────────────┐
│ JSON Files   │  │ Uploaded Files │
│              │  │                │
│ cases.json   │  │ backend/uploads│
│ merkle data  │  │                │
└──────────────┘  └────────────────┘
        │
        │ Merkle root / hash
        ▼
┌──────────────────────────────┐
│ Solidity Smart Contract      │
│                              │
│ Blockchain-recorded values   │
└──────────────────────────────┘
```

The backend is responsible for processing API requests and maintaining application data. Case information and Merkle-tree information are persisted in JSON files, while uploaded files are stored on disk.

The blockchain component provides a separate record of values submitted to the deployed contract. Recording a hash on-chain does not, by itself, prove that the original evidence was collected correctly, that its metadata is authentic, or that access to the evidence has been controlled.

## How Evidence Integrity Works

The integrity workflow uses cryptographic hashes and a Merkle tree.

1. An evidence file is submitted to the backend.
2. The backend processes the evidence and calculates the relevant hash.
3. Evidence hashes are organized into a Merkle tree.
4. A Merkle root represents the combined hash structure.
5. The application can submit the relevant root or hash to the configured smart contract.
6. Later verification can compare recalculated values with previously recorded values.

A matching hash supports the conclusion that the compared data has not changed relative to the data used to produce the original hash. It does not establish the identity of the person who collected the evidence or guarantee a legally valid chain of custody.

## Project Structure

The following is a simplified view of the important project areas. Confirm the current directory names against the repository before using this tree as an exact inventory.

```text
Forensic_Evidence_Management_System/
├── app/                         # Mobile application screens and routes
├── assets/                      # Application assets
├── components/                  # Reusable UI components
├── constants/                   # Application and blockchain configuration
├── utils/                       # Shared utilities and API configuration
├── backend/
│   ├── uploads/                 # Evidence files stored by the backend
│   ├── cases.json               # Local case data
│   ├── merkle_trees.json        # Local Merkle-tree data
│   └── test_backend.py          # Backend testing/endpoint script
├── contracts/                   # Solidity smart contracts
├── scripts/                     # Blockchain scripts, if present
├── artifacts/                   # Generated contract artifacts
├── cache/                       # Generated Hardhat cache
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # JavaScript dependencies and scripts
├── package-lock.json            # npm dependency lockfile
├── .gitignore                   # Git exclusion rules
└── README.md                    # Project documentation
```

`artifacts/` and `cache/` are generated directories and normally should not be committed. The repository should also exclude local virtual environments, installed dependencies, private configuration files, and generated evidence that is not intended to be shared.

## Getting Started

### Prerequisites

Install the tools required by the parts of the application you intend to run.

- Node.js and npm, using versions compatible with the repository's dependency declarations.
- Python 3 and `pip`.
- A compatible Expo development environment or device.
- A compatible Solidity compiler and Hardhat installation, as specified in the project configuration.
- An Ethereum-compatible network if you intend to test blockchain interactions.

The exact supported versions must be verified from the repository's manifests. The commands below are setup guidance, not a claim that a clean installation has already succeeded.

### 1. Clone the repository

```bash
git clone https://github.com/Gideonglady/Forensic_Evidence_Management_System.git
cd Forensic_Evidence_Management_System
```


### 2. Install JavaScript dependencies

```bash
npm install
```

Inspect the available scripts:

```bash
npm run
```

Use the scripts defined in `package.json` rather than assuming that a particular start or build script exists.

If the repository's lockfile is consistent with `package.json`, use `npm ci` for a reproducible installation.

### 3. Set up the Python backend

Create and activate a virtual environment from the backend's documented working directory.

On Windows:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

On Linux or macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies using the dependency file provided by the repository. If the project does not contain a complete dependency declaration, establish one from the actual imports before attempting a clean installation.

For example, if a `requirements.txt` exists in the backend directory:

```bash
pip install -r backend/requirements.txt
```

Do not use this path if the dependency file is located elsewhere.

### 4. Configure the backend

The backend needs writable locations for its JSON data and uploaded files. Check that the application initializes these locations correctly and that the running process has permission to write to them.

Expected project data includes:

```text
backend/cases.json
backend/merkle_trees.json
backend/uploads/
```

Do not populate these files with real forensic evidence or personal information when setting up a development environment.

If the files are absent, initialize them using the format expected by the backend. Do not assume an empty object is valid without checking the code.

### 5. Configure the mobile API URL

The mobile application must be able to reach the backend.

Inspect `utils/api.js` and `constants/config.js` to identify the configuration currently used by the application. The repository contains a development-specific LAN address, so this value should be moved to environment-based configuration before sharing the project.

For a physical device, `localhost` usually refers to the device itself, not the computer running FastAPI. Use the computer's reachable LAN address or an appropriate development-network configuration.

Example configuration:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8000
```

This is an example value, not a claim that the project already reads this variable. Update the application configuration to use it before relying on this setup.

Never commit real credentials or private keys.

### 6. Start the backend

Run the ASGI server using the module and application object defined by the backend source.

For example, if the application object is `app` inside `main.py`:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run this command from the directory where `main.py` is importable.

Confirm that the server starts without import or configuration errors. If the project exposes FastAPI's interactive API documentation, open:

```text
http://127.0.0.1:8000/docs
```

This URL is valid only when the backend is running on the same machine with the default documentation route enabled.

### 7. Compile the smart contract

From the directory containing `hardhat.config.js`:

```bash
npx hardhat compile
```

This should generate the artifacts required by the blockchain integration.

If the application needs a local Hardhat network, start it using the command supported by the installed Hardhat version and configuration.

```bash
npx hardhat node
```

Keep the local node running while deploying the contract and testing interactions.

### 8. Deploy and configure the contract

Inspect the available deployment scripts and the network configuration in `hardhat.config.js`.

Run the deployment command appropriate to the existing script and target network. Do not assume that a contract address in an existing configuration file belongs to the current deployment.

After deployment, configure the application and backend to use the same:

- Network
- Contract address
- Contract ABI
- Required signing configuration

Use only disposable development accounts for local testing. Never place a wallet's private key in source code or commit it to version control.

### 9. Start the mobile application

From the project root:

```bash
npx expo start
```

Follow the Expo CLI instructions to open the application in a compatible development environment or on a device.

Ensure the backend URL is reachable from that environment before testing evidence-related workflows.

## Usage

The following describes the intended development workflow. Exact screen names and API request formats should be taken from the current application and backend implementation.

### Manage cases

Use the mobile interface to access case-related workflows. Case information is stored by the backend in its JSON persistence files.

For API-level testing, inspect the backend routes or the FastAPI documentation to identify the available endpoints and their required parameters.

### Submit evidence

Use the application's evidence workflow to submit a file to the backend. Check the returned response and confirm that the file is stored in the configured upload directory.

Do not use real case evidence during development.

### Generate and verify hashes

Use the implemented hashing and Merkle-tree operations to calculate evidence-related hashes and a Merkle root.

For verification, recalculate the hash from the same evidence bytes and compare it with the stored value. A mismatch should be investigated rather than silently accepted.

### Test blockchain interaction

Once the contract has been deployed and the correct address and network are configured, exercise the relevant backend or application workflow.

Confirm that the transaction succeeds and that the stored value can be read back from the expected contract. A successful local transaction does not demonstrate deployment to a public network.

## Testing

The repository includes `backend/test_backend.py`, which should be inspected to determine the available endpoint checks and execution requirements.

Before treating it as an automated test suite, verify that it uses a test runner such as pytest and that the assertions execute against a controlled test environment.

If it is a standalone script, run it only according to its actual contents and document the result accurately.

Useful initial checks include:

```bash
python -m compileall backend
```

This checks Python source compilation but does not verify runtime behavior, API correctness, file persistence, or blockchain integration.

For the smart contract:

```bash
npx hardhat compile
```

Compilation checks contract syntax and compiler compatibility. It does not establish that the contract behaves correctly.

For the mobile application, use the available scripts in `package.json` and test the main workflows against a running backend.

No test-coverage percentage should be reported unless it has been measured using an actual coverage tool.

## Design Decisions

### File-based persistence

The backend uses JSON files for case and Merkle-tree information instead of a database. This keeps the current implementation relatively simple, but it introduces limitations around concurrent writes, recovery, indexing, and data consistency.

### Hashes and Merkle roots

The project uses cryptographic hashes to represent evidence data and Merkle trees to aggregate hashes. This provides a mechanism for integrity comparisons without storing the entire evidence file in a smart contract.

### Separation of mobile and backend logic

The React Native application communicates with the backend over HTTP. This separates mobile presentation from evidence processing and local persistence, although the API configuration must be maintained correctly across development environments.

### Blockchain as an integrity record

The smart contract records selected cryptographic values. The evidence files themselves remain under backend file storage. The blockchain record does not replace secure file storage, access control, audit logging, or a documented chain-of-custody process.

### Development placeholders

Some photo-processing behavior returns mocked metadata. This is a development limitation, not a working forensic image-analysis capability. The implementation should distinguish placeholder responses from results produced by a real processing pipeline.

## Limitations and Future Work

The current implementation has several limitations that should be addressed before production use.

- **Persistence:** JSON files are not a substitute for transactional database storage in a multi-user application.
- **Authentication and authorization:** The project does not currently provide a complete authentication and role-based authorization layer.
- **Evidence security:** Production use requires controlled access, secure storage, integrity verification, and a documented chain-of-custody process.
- **Photo analysis:** Mock metadata must be replaced with a real, validated implementation if image analysis is a project requirement.
- **Configuration:** Development-specific IP addresses and blockchain configuration should be supplied externally rather than embedded in source code.
- **Blockchain consistency:** Network, contract address, ABI, and signing configuration must be aligned and verified.
- **Automated testing:** The project needs repeatable tests for API routes, file handling, hashing, Merkle-tree operations, and smart-contract interactions.
- **Deployment:** Production deployment would require a defined hosting environment, secrets management, monitoring, backup procedures, and a security review.

These are areas for future work, not claims that the current implementation already supports them.

## Author

**Gideon Glady K**

