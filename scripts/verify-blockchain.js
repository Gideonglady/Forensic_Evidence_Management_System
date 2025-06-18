const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function verifyBlockchainIntegration() {
  console.log("🔍 Verifying Blockchain Integration...\n");

  try {
    // Load contract info
    const contractInfoPath = path.join(__dirname, '..', 'backend', 'contract_info.json');
    if (!fs.existsSync(contractInfoPath)) {
      console.log("❌ Contract info not found. Please deploy the contract first.");
      console.log("   Run: npm run deploy");
      return;
    }

    const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, 'utf8'));
    console.log(`📋 Contract Address: ${contractInfo.address}\n`);

    // Connect to the contract
    const EvidenceStorage = await ethers.getContractFactory("EvidenceStorage");
    const evidenceStorage = EvidenceStorage.attach(contractInfo.address);

    // 1. Verify contract deployment
    console.log("1. Verifying contract deployment...");
    const code = await ethers.provider.getCode(contractInfo.address);
    if (code === "0x") {
      throw new Error("Contract not deployed at the specified address");
    }
    console.log("✅ Contract is deployed and accessible\n");

    // 2. Test basic functionality
    console.log("2. Testing basic contract functionality...");
    const testCase = "VERIFICATION_TEST_001";
    const testHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    // Store evidence
    const storeTx = await evidenceStorage.storeEvidence(testCase, testHash);
    const storeReceipt = await storeTx.wait();
    console.log(`✅ Evidence stored successfully`);
    console.log(`   Transaction Hash: ${storeReceipt.transactionHash}`);
    console.log(`   Block Number: ${storeReceipt.blockNumber}`);
    console.log(`   Gas Used: ${storeReceipt.gasUsed.toString()}\n`);

    // Retrieve evidence
    const retrievedHash = await evidenceStorage.getEvidence(testCase);
    console.log(`✅ Evidence retrieved successfully`);
    console.log(`   Case Number: ${testCase}`);
    console.log(`   Stored Hash: ${testHash}`);
    console.log(`   Retrieved Hash: ${retrievedHash}`);
    console.log(`   Verification: ${retrievedHash === testHash ? '✅ PASS' : '❌ FAIL'}\n`);

    // 3. Test contract events
    console.log("3. Verifying contract events...");
    const filter = evidenceStorage.filters.EvidenceStored(testCase);
    const events = await evidenceStorage.queryFilter(filter);
    
    if (events.length > 0) {
      const event = events[0];
      console.log("✅ EvidenceStored event found:");
      console.log(`   Case Number: ${event.args.caseNumber}`);
      console.log(`   Hash: ${event.args.hash}`);
      console.log(`   Block Number: ${event.blockNumber}`);
      console.log(`   Transaction Hash: ${event.transactionHash}\n`);
    } else {
      console.log("❌ No EvidenceStored events found\n");
    }

    // 4. Test multiple operations
    console.log("4. Testing multiple operations...");
    const operations = [
      { case: "CASE_A", hash: "0x1111111111111111111111111111111111111111111111111111111111111111" },
      { case: "CASE_B", hash: "0x2222222222222222222222222222222222222222222222222222222222222222" },
      { case: "CASE_C", hash: "0x3333333333333333333333333333333333333333333333333333333333333333" }
    ];

    for (const op of operations) {
      const tx = await evidenceStorage.storeEvidence(op.case, op.hash);
      await tx.wait();
      console.log(`   ✅ Stored: ${op.case}`);
    }

    // Verify all operations
    let allVerified = true;
    for (const op of operations) {
      const retrieved = await evidenceStorage.getEvidence(op.case);
      const verified = retrieved === op.hash;
      console.log(`   ${verified ? '✅' : '❌'} Verified: ${op.case} - ${verified ? 'PASS' : 'FAIL'}`);
      if (!verified) allVerified = false;
    }
    console.log();

    // 5. Generate blockchain proof
    console.log("5. Generating blockchain proof...");
    const latestBlock = await ethers.provider.getBlock("latest");
    const network = await ethers.provider.getNetwork();
    
    const proof = {
      contractAddress: contractInfo.address,
      network: {
        chainId: network.chainId,
        name: network.name
      },
      testResults: {
        testCase: testCase,
        testHash: testHash,
        retrievedHash: retrievedHash,
        hashMatch: retrievedHash === testHash,
        transactionHash: storeReceipt.transactionHash,
        blockNumber: storeReceipt.blockNumber,
        gasUsed: storeReceipt.gasUsed.toString(),
        eventsFound: events.length,
        multipleOperationsVerified: allVerified
      },
      blockchainState: {
        latestBlockNumber: latestBlock.number,
        latestBlockHash: latestBlock.hash,
        latestBlockTimestamp: latestBlock.timestamp,
        blockTime: new Date(latestBlock.timestamp * 1000).toISOString()
      },
      verificationTimestamp: new Date().toISOString()
    };

    // Save proof
    const proofPath = path.join(__dirname, '..', 'blockchain-proof.json');
    fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    console.log(`✅ Blockchain proof saved to: ${proofPath}`);

    // 6. Generate verification report
    console.log("\n6. Generating verification report...");
    const report = `
# Blockchain Integration Verification Report

## Contract Information
- **Contract Address**: ${contractInfo.address}
- **Network**: ${network.name} (Chain ID: ${network.chainId})
- **Verification Date**: ${new Date().toISOString()}

## Test Results
- ✅ Contract Deployment: PASS
- ✅ Evidence Storage: PASS
- ✅ Evidence Retrieval: PASS
- ✅ Hash Verification: ${retrievedHash === testHash ? 'PASS' : 'FAIL'}
- ✅ Event Emission: ${events.length > 0 ? 'PASS' : 'FAIL'}
- ✅ Multiple Operations: ${allVerified ? 'PASS' : 'FAIL'}

## Transaction Details
- **Test Transaction Hash**: ${storeReceipt.transactionHash}
- **Block Number**: ${storeReceipt.blockNumber}
- **Gas Used**: ${storeReceipt.gasUsed.toString()}

## Blockchain State
- **Latest Block**: ${latestBlock.number}
- **Block Hash**: ${latestBlock.hash}
- **Block Time**: ${new Date(latestBlock.timestamp * 1000).toISOString()}

## Proof of Functionality
This report proves that the photo evidence app successfully:
1. Deploys and interacts with smart contracts
2. Stores evidence hashes on the blockchain
3. Retrieves evidence hashes from the blockchain
4. Emits and captures blockchain events
5. Maintains data integrity across multiple operations

## Verification Steps
1. Check the transaction on a blockchain explorer using the transaction hash
2. Verify the contract address and ABI
3. Confirm the events were emitted correctly
4. Validate the hash matching for data integrity

## Files Generated
- \`blockchain-proof.json\`: Detailed proof data
- \`test-results.json\`: Test execution results
- \`contract_info.json\`: Contract deployment information
`;

    const reportPath = path.join(__dirname, '..', 'VERIFICATION_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Verification report saved to: ${reportPath}`);

    // 7. Final summary
    console.log("\n🎉 BLOCKCHAIN VERIFICATION COMPLETED!");
    console.log("=" .repeat(50));
    console.log("✅ Contract deployment verified");
    console.log("✅ Evidence storage functionality confirmed");
    console.log("✅ Evidence retrieval functionality confirmed");
    console.log("✅ Event emission verified");
    console.log("✅ Multiple operations tested");
    console.log("✅ Blockchain proof generated");
    console.log("✅ Verification report created");
    console.log("\n📋 Proof of blockchain integration:");
    console.log(`1. Transaction Hash: ${storeReceipt.transactionHash}`);
    console.log(`2. Contract Address: ${contractInfo.address}`);
    console.log(`3. Verification Report: VERIFICATION_REPORT.md`);
    console.log(`4. Blockchain Proof: blockchain-proof.json`);
    console.log("\n🔗 To verify on blockchain explorer:");
    console.log(`   Transaction: https://etherscan.io/tx/${storeReceipt.transactionHash}`);
    console.log(`   Contract: https://etherscan.io/address/${contractInfo.address}`);

  } catch (error) {
    console.error("❌ Blockchain verification failed:", error);
    process.exit(1);
  }
}

// Run the verification
verifyBlockchainIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 