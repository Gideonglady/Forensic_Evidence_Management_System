// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MerkleEvidence {
    // Mapping from case number to Merkle root
    mapping(string => bytes32) public caseMerkleRoots;
    
    // Mapping from case number to array of evidence hashes
    mapping(string => bytes32[]) public caseEvidenceHashes;

    // Event emitted when a Merkle root is stored
    event MerkleRootStored(string indexed caseNumber, bytes32 merkleRoot);
    
    // Event emitted when evidence is added
    event EvidenceAdded(string indexed caseNumber, bytes32 evidenceHash);

    // Store or update the Merkle root for a case
    function storeMerkleRoot(string calldata caseNumber, bytes32 merkleRoot) external {
        caseMerkleRoots[caseNumber] = merkleRoot;
        emit MerkleRootStored(caseNumber, merkleRoot);
    }

    // Add evidence hash to a case
    function addEvidence(string calldata caseNumber, bytes32 evidenceHash) external {
        caseEvidenceHashes[caseNumber].push(evidenceHash);
        emit EvidenceAdded(caseNumber, evidenceHash);
    }

    // Get all evidence hashes for a case
    function getEvidenceHashes(string calldata caseNumber) external view returns (bytes32[] memory) {
        return caseEvidenceHashes[caseNumber];
    }

    // Retrieve the Merkle root for a case
    function getMerkleRoot(string calldata caseNumber) external view returns (bytes32) {
        return caseMerkleRoots[caseNumber];
    }
} 