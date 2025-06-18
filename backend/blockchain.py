from web3 import Web3
import json
import os
from typing import Dict, Any
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Blockchain configuration
GANACHE_URL = os.getenv("GANACHE_URL", "http://127.0.0.1:8545")
CONTRACT_INFO_PATH = os.path.join(os.path.dirname(__file__), "contract_info.json")

class BlockchainService:
    def __init__(self):
        self.web3 = Web3(Web3.HTTPProvider(GANACHE_URL))
        if not self.web3.is_connected():
            raise ConnectionError(f"Failed to connect to Ganache at {GANACHE_URL}")
        
        # Load contract info
        with open(CONTRACT_INFO_PATH) as f:
            contract_info = json.load(f)
        
        self.contract_address = contract_info['address']
        self.contract_abi = contract_info['abi']
        self.contract = self.web3.eth.contract(
            address=self.contract_address,
            abi=self.contract_abi
        )
        
        # Get the first account from Ganache
        self.account = self.web3.eth.accounts[0]
        logger.info(f"Using account: {self.account}")

    def store_evidence(self, case_number: str, hash_str: str) -> Dict[str, Any]:
        try:
            # Build the transaction
            nonce = self.web3.eth.get_transaction_count(self.account)
            txn = self.contract.functions.storeEvidence(
                case_number,
                hash_str
            ).build_transaction({
                'from': self.account,
                'gas': 3000000,
                'gasPrice': self.web3.to_wei('1', 'gwei'),
                'nonce': nonce
            })

            # Send the transaction
            tx_hash = self.web3.eth.send_transaction(txn)
            logger.info(f"Transaction sent: {tx_hash.hex()}")
            
            # Wait for transaction receipt
            tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info(f"Transaction mined: {tx_receipt.transactionHash.hex()}")
            
            return {
                "transaction_hash": tx_receipt.transactionHash.hex(),
                "block_number": tx_receipt.blockNumber,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error storing evidence: {str(e)}")
            raise

    def get_evidence(self, case_number: str) -> Dict[str, Any]:
        try:
            hash_str = self.contract.functions.getEvidence(case_number).call()
            return {
                "case_number": case_number,
                "hash": hash_str,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error retrieving evidence: {str(e)}")
            raise

# Create a singleton instance
blockchain_service = BlockchainService() 