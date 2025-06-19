// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MerkleEvidence {
    // Mapping from case number to Merkle root
    mapping(string => bytes32) public caseMerkleRoots;

    // Event emitted when a Merkle root is stored
    event MerkleRootStored(string indexed caseNumber, bytes32 merkleRoot);

    // Store or update the Merkle root for a case
    function storeMerkleRoot(string calldata caseNumber, bytes32 merkleRoot) external {
        caseMerkleRoots[caseNumber] = merkleRoot;
        emit MerkleRootStored(caseNumber, merkleRoot);
    }

    // Retrieve the Merkle root for a case
    function getMerkleRoot(string calldata caseNumber) external view returns (bytes32) {
        return caseMerkleRoots[caseNumber];
    }
} 