from web3 import Web3

web3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
print("Is connected:", web3.is_connected()) 