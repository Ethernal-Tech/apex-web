export const reactorGatewayABI = `[
	{
        "inputs": [
            {
                "internalType": "uint8",
                "name": "_destinationChainId",
                "type": "uint8"
            },
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "receiver",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct IGatewayStructs.ReceiverWithdraw[]",
                "name": "_receivers",
                "type": "tuple[]"
            },
            {
                "internalType": "uint256",
                "name": "_feeAmount",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]`;

export const skylineGatewayABI = `[
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "_destinationChainId",
                "type": "uint8"
            },
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "receiver",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint16",
                        "name": "tokenId",
                        "type": "uint16"
                    }
                ],
                "internalType": "struct IGatewayStructs.ReceiverWithdraw[]",
                "name": "_receivers",
                "type": "tuple[]"
            },
            {
                "internalType": "uint256",
                "name": "_fee",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_operationFee",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]`;

export const erc20ABI = `[{
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]`;
