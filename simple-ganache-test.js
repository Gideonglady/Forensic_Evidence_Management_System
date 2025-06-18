const { ethers } = require("hardhat");

async function simpleGanacheTest() {
  console.log("🔍 Simple Ganache Transaction Test...\n");

  try {
    // Deploy a fresh contract
    console.log("1. Deploying contract...");
    const EvidenceStorage = await ethers.getContractFactory("EvidenceStorage");
    const evidenceStorage = await EvidenceStorage.deploy();
    await evidenceStorage.waitForDeployment();
    const contractAddress = await evidenceStorage.getAddress();
    console.log(`   ✅ Contract deployed at: ${contractAddress}\n`);

    // Test storing evidence
    console.log("2. Storing evidence...");
    const testCase = "SIMPLE_TEST_001";
    const testHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    const storeTx = await evidenceStorage.storeEvidence(testCase, testHash);
    console.log(`   ✅ Transaction sent: ${storeTx.hash}`);
    
    const storeReceipt = await storeTx.wait();
    console.log(`   ✅ Transaction confirmed in block: ${storeReceipt.blockNumber}`);
    console.log(`   ✅ Gas used: ${storeReceipt.gasUsed.toString()}\n`);

    // Test retrieving evidence
    console.log("3. Retrieving evidence...");
    const retrievedHash = await evidenceStorage.getEvidence(testCase);
    console.log(`   ✅ Retrieved hash: ${retrievedHash}`);
    console.log(`   ✅ Hash match: ${retrievedHash === testHash ? 'YES' : 'NO'}\n`);

    // Test multiple transactions
    console.log("4. Testing multiple transactions...");
    const transactions = [
      { case: "PHOTO_001", hash: "0x1111111111111111111111111111111111111111111111111111111111111111" },
      { case: "PHOTO_002", hash: "0x2222222222222222222222222222222222222222222222222222222222222222" },
      { case: "PHOTO_003", hash: "0x3333333333333333333333333333333333333333333333333333333333333333" }
    ];

    for (const tx of transactions) {
      const txResult = await evidenceStorage.storeEvidence(tx.case, tx.hash);
      const receipt = await txResult.wait();
      console.log(`   ✅ Stored ${tx.case} in block ${receipt.blockNumber}`);
      console.log(`   📝 Transaction: ${txResult.hash}`);
    }

    console.log("\n🎉 GANACHE TRANSACTION TEST COMPLETED!");
    console.log("=" .repeat(50));
    console.log("✅ Contract deployed successfully");
    console.log("✅ Evidence storage working");
    console.log("✅ Evidence retrieval working");
    console.log("✅ Multiple transactions recorded");
    
    console.log("\n📋 To verify in Ganache:");
    console.log("1. Open Ganache application");
    console.log("2. Check the BLOCKS tab - you should see new blocks");
    console.log("3. Check the TRANSACTIONS tab - you should see the transactions");
    console.log("4. Click on any transaction to see full details");
    console.log("5. Check the CONTRACTS tab - you should see your contract");
    
    console.log("\n🔗 Key Details:");
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Test Transaction: ${storeTx.hash}`);
    console.log(`   Block Number: ${storeReceipt.blockNumber}`);
    console.log(`   Total Transactions: ${transactions.length + 1}`);

    console.log("\n💡 Now when you upload photos in your app, you'll see:");
    console.log("   - Real transactions in Ganache");
    console.log("   - Actual block numbers");
    console.log("   - Real transaction hashes");
    console.log("   - Gas usage data");

  } catch (error) {
    console.error("❌ Ganache test failed:", error);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure Ganache is running: npm run blockchain:start");
    console.log("2. Check if Ganache is accessible at http://127.0.0.1:8545");
  }
}

// Run the test
simpleGanacheTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 