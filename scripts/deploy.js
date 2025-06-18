const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const EvidenceStorage = await hre.ethers.getContractFactory("EvidenceStorage");
  const evidenceStorage = await EvidenceStorage.deploy();

  // Wait for deployment to finish
  await evidenceStorage.waitForDeployment();

  const address = await evidenceStorage.getAddress();
  console.log("EvidenceStorage deployed to:", address);
  
  // Create the backend directory if it doesn't exist
  const backendDir = path.join(__dirname, '..', 'backend');
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }
  
  // Save the contract address and ABI to a file for the backend
  const contractInfo = {
    address: address,
    abi: EvidenceStorage.interface.formatJson()
  };
  
  const outputPath = path.join(backendDir, 'contract_info.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log(`Contract info saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 