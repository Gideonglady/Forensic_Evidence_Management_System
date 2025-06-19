const { ethers } = require("hardhat");

async function main() {
  const MerkleEvidence = await ethers.getContractFactory("MerkleEvidence");
  const merkleEvidence = await MerkleEvidence.deploy();
  await merkleEvidence.deployed();
  console.log("MerkleEvidence deployed to:", merkleEvidence.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
