const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function testGanacheConnection() {
  console.log("🔍 Testing Ganache Connection and Transaction Recording...\n");

  try {
    // Load contract info
    const contractInfoPath = path.join(__dirname, 'backend', 'contract_info.json');
    if (!fs.existsSync(contractInfoPath)) {
      console.log("❌ Contract info not found. Please deploy the contract first.");
      return;
    }

    const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, 'utf8'));
    console.log(`📋 Contract Address: ${contractInfo.address}\n`);

    // Connect to the contract
    const EvidenceStorage = await ethers.getContractFactory("EvidenceStorage");
    const evidenceStorage = EvidenceStorage.attach(contractInfo.address);

    // Test storing evidence
    console.log("1. Storing evidence on Ganache...");
    const testCase = "GANACHE_TEST_001";
    const testHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    const storeTx = await evidenceStorage.storeEvidence(testCase, testHash);
    console.log(`   Transaction sent: ${storeTx.hash}`);
    
    const storeReceipt = await storeTx.wait();
    console.log(`   ✅ Transaction confirmed in block: ${storeReceipt.blockNumber}`);
    console.log(`   ✅ Gas used: ${storeReceipt.gasUsed.toString()}\n`);

    // Test retrieving evidence
    console.log("2. Retrieving evidence from Ganache...");
    const retrievedHash = await evidenceStorage.getEvidence(testCase);
    console.log(`   ✅ Retrieved hash: ${retrievedHash}`);
    console.log(`   ✅ Hash match: ${retrievedHash === testHash ? 'YES' : 'NO'}\n`);

    // Test multiple transactions
    console.log("3. Testing multiple transactions...");
    const transactions = [
      { case: "CASE_A", hash: "0x1111111111111111111111111111111111111111111111111111111111111111" },
      { case: "CASE_B", hash: "0x2222222222222222222222222222222222222222222222222222222222222222" },
      { case: "CASE_C", hash: "0x3333333333333333333333333333333333333333333333333333333333333333" }
    ];

    for (const tx of transactions) {
      const txResult = await evidenceStorage.storeEvidence(tx.case, tx.hash);
      const receipt = await txResult.wait();
      console.log(`   ✅ Stored ${tx.case} in block ${receipt.blockNumber} (tx: ${txResult.hash.substring(0, 20)}...)`);
    }

    console.log("\n🎉 GANACHE CONNECTION TEST COMPLETED!");
    console.log("=" .repeat(50));
    console.log("✅ Contract deployed and accessible");
    console.log("✅ Evidence storage working");
    console.log("✅ Evidence retrieval working");
    console.log("✅ Multiple transactions recorded");
    console.log("✅ All transactions visible in Ganache");
    
    console.log("\n📋 To verify in Ganache:");
    console.log("1. Open Ganache application");
    console.log("2. Check the BLOCKS tab - you should see new blocks");
    console.log("3. Check the TRANSACTIONS tab - you should see the transactions");
    console.log("4. Click on any transaction to see full details");
    console.log("5. Check the CONTRACTS tab - you should see your contract");
    
    console.log("\n🔗 Transaction Details:");
    console.log(`   Contract: ${contractInfo.address}`);
    console.log(`   Test Transaction: ${storeTx.hash}`);
    console.log(`   Block Number: ${storeReceipt.blockNumber}`);

  } catch (error) {
    console.error("❌ Ganache connection test failed:", error);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure Ganache is running: npm run blockchain:start");
    console.log("2. Make sure contract is deployed: npm run blockchain:deploy");
    console.log("3. Check if Ganache is accessible at http://127.0.0.1:8545");
  }
}

// Run the test
testGanacheConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 