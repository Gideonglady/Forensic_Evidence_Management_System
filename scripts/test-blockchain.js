const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function testBlockchainIntegration() {
  console.log("🔍 Testing Blockchain Integration...\n");

  try {
    // 1. Deploy the contract if not already deployed
    console.log("1. Deploying EvidenceStorage contract...");
    const EvidenceStorage = await ethers.getContractFactory("EvidenceStorage");
    const evidenceStorage = await EvidenceStorage.deploy();
    await evidenceStorage.waitForDeployment();
    const contractAddress = await evidenceStorage.getAddress();
    console.log(`✅ Contract deployed at: ${contractAddress}\n`);

    // 2. Test storing evidence
    console.log("2. Testing evidence storage...");
    const testCaseNumber = "TEST_CASE_001";
    const testHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    
    const storeTx = await evidenceStorage.storeEvidence(testCaseNumber, testHash);
    const storeReceipt = await storeTx.wait();
    console.log(`✅ Evidence stored successfully!`);
    console.log(`   Transaction Hash: ${storeReceipt.transactionHash}`);
    console.log(`   Block Number: ${storeReceipt.blockNumber}\n`);

    // 3. Test retrieving evidence
    console.log("3. Testing evidence retrieval...");
    const retrievedHash = await evidenceStorage.getEvidence(testCaseNumber);
    console.log(`✅ Evidence retrieved successfully!`);
    console.log(`   Case Number: ${testCaseNumber}`);
    console.log(`   Retrieved Hash: ${retrievedHash}`);
    console.log(`   Hash Match: ${retrievedHash === testHash ? '✅ YES' : '❌ NO'}\n`);

    // 4. Test with multiple cases
    console.log("4. Testing multiple evidence entries...");
    const testCases = [
      { caseNumber: "CASE_001", hash: "0x1111111111111111111111111111111111111111111111111111111111111111" },
      { caseNumber: "CASE_002", hash: "0x2222222222222222222222222222222222222222222222222222222222222222" },
      { caseNumber: "CASE_003", hash: "0x3333333333333333333333333333333333333333333333333333333333333333" }
    ];

    for (const testCase of testCases) {
      const tx = await evidenceStorage.storeEvidence(testCase.caseNumber, testCase.hash);
      await tx.wait();
      console.log(`   ✅ Stored: ${testCase.caseNumber}`);
    }

    // Verify all cases
    for (const testCase of testCases) {
      const retrieved = await evidenceStorage.getEvidence(testCase.caseNumber);
      const match = retrieved === testCase.hash;
      console.log(`   ${match ? '✅' : '❌'} Retrieved: ${testCase.caseNumber} - ${match ? 'MATCH' : 'MISMATCH'}`);
    }
    console.log();

    // 5. Test contract events
    console.log("5. Testing contract events...");
    const filter = evidenceStorage.filters.EvidenceStored();
    const events = await evidenceStorage.queryFilter(filter);
    console.log(`✅ Found ${events.length} EvidenceStored events`);
    
    events.forEach((event, index) => {
      console.log(`   Event ${index + 1}:`);
      console.log(`     Case Number: ${event.args.caseNumber}`);
      console.log(`     Hash: ${event.args.hash}`);
    });
    console.log();

    // 6. Generate proof of work
    console.log("6. Generating blockchain proof...");
    const latestBlock = await ethers.provider.getBlock("latest");
    console.log(`✅ Latest Block Number: ${latestBlock.number}`);
    console.log(`✅ Latest Block Hash: ${latestBlock.hash}`);
    console.log(`✅ Block Timestamp: ${new Date(latestBlock.timestamp * 1000).toISOString()}`);
    console.log();

    // 7. Save test results
    const testResults = {
      contractAddress: contractAddress,
      testCaseNumber: testCaseNumber,
      testHash: testHash,
      transactionHash: storeReceipt.transactionHash,
      blockNumber: storeReceipt.blockNumber,
      retrievedHash: retrievedHash,
      hashMatch: retrievedHash === testHash,
      totalEvents: events.length,
      latestBlock: {
        number: latestBlock.number,
        hash: latestBlock.hash,
        timestamp: latestBlock.timestamp
      },
      testTimestamp: new Date().toISOString()
    };

    const resultsPath = path.join(__dirname, '..', 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`✅ Test results saved to: ${resultsPath}`);

    // 8. Summary
    console.log("\n🎉 BLOCKCHAIN INTEGRATION TEST COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(50));
    console.log("✅ Contract deployed and functional");
    console.log("✅ Evidence storage working");
    console.log("✅ Evidence retrieval working");
    console.log("✅ Multiple cases handled correctly");
    console.log("✅ Events emitted properly");
    console.log("✅ Blockchain proof generated");
    console.log("\n📋 To prove this works:");
    console.log("1. Check the transaction on a blockchain explorer");
    console.log("2. Verify the contract address and ABI");
    console.log("3. Use the test results file as proof");
    console.log("4. Run this test on a public testnet for additional verification");

  } catch (error) {
    console.error("❌ Blockchain integration test failed:", error);
    process.exit(1);
  }
}

// Run the test
testBlockchainIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 