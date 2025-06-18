// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceStorage {
    mapping(string => string) public evidence;
    
    event EvidenceStored(string caseNumber, string hash);
    event EvidenceRetrieved(string caseNumber, string hash);

    function storeEvidence(string memory caseNumber, string memory hash) public {
        evidence[caseNumber] = hash;
        emit EvidenceStored(caseNumber, hash);
    }

    function getEvidence(string memory caseNumber) public view returns (string memory) {
        string memory hash = evidence[caseNumber];
        emit EvidenceRetrieved(caseNumber, hash);
        return hash;
    }
} 