# 🔗 Ganache Setup & Transaction Verification Guide

## 🎯 What You Need to See in Ganache

When you upload photos in your app, you should see **real transactions** appearing in Ganache with:
- ✅ **New blocks** being created
- ✅ **Transaction hashes** for each photo upload
- ✅ **Block numbers** where transactions are stored
- ✅ **Gas usage** for each transaction
- ✅ **Contract interactions** with your EvidenceStorage contract

---

## 🚀 Step-by-Step Setup

### Step 1: Start Ganache
```bash
npm run blockchain:start
```
This starts a local Hardhat node (Ganache) at `http://127.0.0.1:8545`

### Step 2: Deploy Contract
```bash
npm run blockchain:deploy
```
This deploys your EvidenceStorage contract to Ganache

### Step 3: Update App Configuration
Your app is already configured to use real blockchain (not mock data):
- `USE_MOCK_BLOCKCHAIN: false` in `constants/config.js`

### Step 4: Start Backend (Optional)
```bash
cd backend && python main.py
```
This starts the backend server that connects to Ganache

---

## 📱 How to Test Photo Upload with Ganache

### 1. Open Ganache Application
- Launch Ganache on your computer
- You should see it running at `http://127.0.0.1:8545`

### 2. Upload Photos in Your App
- Open your photo evidence app
- Create a new case
- Upload photos
- Watch the blockchain proof modal

### 3. Check Ganache for Transactions
After uploading photos, check Ganache:

#### **BLOCKS Tab**
- You should see new blocks being created
- Each block contains your transactions
- Click on blocks to see transaction details

#### **TRANSACTIONS Tab**
- You should see transactions with your contract address
- Transaction hashes match what's shown in your app
- Click on transactions to see full details

#### **CONTRACTS Tab**
- You should see your EvidenceStorage contract
- Contract address: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

---

## 🔍 What You'll See in Ganache

### Transaction Details in Ganache:
```
Transaction Hash: 0xd94f4a96ea0705c7b8112ca08d2992886a8f6ede395b46dc1d69bbf7d161c0c0
Block Number: 1
Gas Used: 26300
Contract Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Method: storeEvidence
Parameters:
  - caseNumber: "CASE_001"
  - hash: "0x1234567890abcdef..."
```

### Block Details:
```
Block #1
Hash: 0xc9abc8716385c38aa560e2340adb8873059c5d4fd76b2a7b0963a91fb9074311
Timestamp: 2025-06-18T05:28:43.000Z
Transactions: 1
```

---

## 🧪 Manual Testing Commands

### Test 1: Direct Contract Interaction
```bash
npx hardhat console --network localhost
```

Then in the console:
```javascript
// Get contract
const EvidenceStorage = await ethers.getContractFactory("EvidenceStorage")
const contract = EvidenceStorage.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512")

// Store evidence
const tx = await contract.storeEvidence("TEST_CASE", "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
await tx.wait()

// Check Ganache - you should see this transaction!
```

### Test 2: Check Contract State
```javascript
// Get stored evidence
const hash = await contract.getEvidence("TEST_CASE")
console.log("Stored hash:", hash)

// Check events
const filter = contract.filters.EvidenceStored()
const events = await contract.queryFilter(filter)
console.log("Events:", events)
```

---

## 📊 Expected Results

### In Your App:
- ✅ Blockchain proof modal shows real transaction hashes
- ✅ Progress updates during upload
- ✅ Success message with block number
- ✅ Real gas usage displayed

### In Ganache:
- ✅ New blocks created for each transaction
- ✅ Transaction hashes match app display
- ✅ Contract interactions visible
- ✅ Gas usage recorded
- ✅ Events emitted

---

## 🔧 Troubleshooting

### Problem: No transactions in Ganache
**Solution:**
1. Make sure Ganache is running: `npm run blockchain:start`
2. Check if contract is deployed: `npm run blockchain:deploy`
3. Verify app config: `USE_MOCK_BLOCKCHAIN: false`

### Problem: App shows mock data
**Solution:**
1. Check `constants/config.js` - should be `USE_MOCK_BLOCKCHAIN: false`
2. Restart your app after changing config
3. Make sure backend is running if using API calls

### Problem: Backend connection failed
**Solution:**
1. Install backend dependencies: `cd backend && pip install -r requirements.txt`
2. Start backend: `cd backend && python main.py`
3. Check if Ganache is accessible at `http://127.0.0.1:8545`

---

## 🎯 Verification Checklist

After uploading photos, verify:

### ✅ In Your App:
- [ ] Blockchain proof modal appears
- [ ] Real transaction hash displayed
- [ ] Block number shown
- [ ] Gas usage recorded
- [ ] Success message appears

### ✅ In Ganache:
- [ ] New blocks created
- [ ] Transactions visible in TRANSACTIONS tab
- [ ] Contract interactions in CONTRACTS tab
- [ ] Transaction hashes match app display
- [ ] Events emitted for each storage

### ✅ Data Integrity:
- [ ] Hash in app matches hash in Ganache
- [ ] Case number stored correctly
- [ ] Timestamp recorded
- [ ] Gas usage reasonable

---

## 🚀 Quick Test Commands

```bash
# 1. Start Ganache
npm run blockchain:start

# 2. Deploy contract
npm run blockchain:deploy

# 3. Test connection
node simple-ganache-test.js

# 4. Start backend (optional)
cd backend && python main.py

# 5. Upload photos in your app and check Ganache!
```

---

## 📋 Summary

**When you upload photos in your app, you should see:**

1. **Real-time blockchain proof modal** in your app
2. **Actual transactions** appearing in Ganache
3. **Block numbers** and **transaction hashes** that match
4. **Gas usage** and **contract interactions** recorded
5. **Events** emitted for each photo storage

**This proves your app is actually storing data on the blockchain!** 🎉

---

**Next Steps:**
1. Follow the setup guide above
2. Upload photos in your app
3. Check Ganache for real transactions
4. Share screenshots/videos as proof of blockchain integration 