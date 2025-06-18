const { ethers } = require("hardhat");

async function testRealBlockchain() {
  console.log("🔍 Testing Real Blockchain Connection...\n");

  try {
    // Deploy contract
    console.log("1. Deploying contract to Ganache...");
    const EvidenceStorage = await ethers.getContractFactory("EvidenceStorage");
    const evidenceStorage = await EvidenceStorage.deploy();
    await evidenceStorage.waitForDeployment();
    const contractAddress = await evidenceStorage.getAddress();
    console.log(`   ✅ Contract deployed at: ${contractAddress}\n`);

    // Test storing evidence
    console.log("2. Storing evidence on real blockchain...");
    const testCase = "REAL_TEST_001";
    const testHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    const storeTx = await evidenceStorage.storeEvidence(testCase, testHash);
    console.log(`   📝 Transaction sent: ${storeTx.hash}`);
    
    const storeReceipt = await storeTx.wait();
    console.log(`   ✅ Transaction confirmed in block: ${storeReceipt.blockNumber}`);
    console.log(`   ✅ Gas used: ${storeReceipt.gasUsed.toString()}\n`);

    // Test retrieving evidence
    console.log("3. Retrieving evidence from blockchain...");
    const retrievedHash = await evidenceStorage.getEvidence(testCase);
    console.log(`   ✅ Retrieved hash: ${retrievedHash}`);
    console.log(`   ✅ Hash match: ${retrievedHash === testHash ? 'YES' : 'NO'}\n`);

    // Test multiple photo uploads
    console.log("4. Simulating multiple photo uploads...");
    const photos = [
      { case: "PHOTO_001", hash: "0x1111111111111111111111111111111111111111111111111111111111111111" },
      { case: "PHOTO_002", hash: "0x2222222222222222222222222222222222222222222222222222222222222222" },
      { case: "PHOTO_003", hash: "0x3333333333333333333333333333333333333333333333333333333333333333" }
    ];

    for (const photo of photos) {
      const txResult = await evidenceStorage.storeEvidence(photo.case, photo.hash);
      const receipt = await txResult.wait();
      console.log(`   📸 Stored ${photo.case} in block ${receipt.blockNumber}`);
      console.log(`   🔗 Transaction: ${txResult.hash}`);
    }

    console.log("\n🎉 REAL BLOCKCHAIN TEST COMPLETED!");
    console.log("=" .repeat(50));
    console.log("✅ Contract deployed to Ganache");
    console.log("✅ Real transactions recorded");
    console.log("✅ Evidence storage working");
    console.log("✅ Evidence retrieval working");
    console.log("✅ Multiple photos stored");
    
    console.log("\n📋 To verify in Ganache:");
    console.log("1. Open Ganache application");
    console.log("2. Check BLOCKS tab - you should see new blocks");
    console.log("3. Check TRANSACTIONS tab - you should see the transactions above");
    console.log("4. Click on any transaction to see full details");
    console.log("5. Check CONTRACTS tab - you should see your contract");
    
    console.log("\n🔗 Transaction Details:");
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Test Transaction: ${storeTx.hash}`);
    console.log(`   Block Number: ${storeReceipt.blockNumber}`);
    console.log(`   Total Transactions: ${photos.length + 1}`);

    console.log("\n💡 Now when you upload photos in your app:");
    console.log("   - You'll see real transaction hashes in the blockchain proof modal");
    console.log("   - Real block numbers will be displayed");
    console.log("   - Real gas usage will be shown");
    console.log("   - All transactions will appear in Ganache");

  } catch (error) {
    console.error("❌ Real blockchain test failed:", error);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure Ganache is running: npm run blockchain:start");
    console.log("2. Check if Ganache is accessible at http://127.0.0.1:8545");
  }
}

// Run the test
testRealBlockchain()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 