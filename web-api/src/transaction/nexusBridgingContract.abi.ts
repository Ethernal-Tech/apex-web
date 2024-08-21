export const nexusBridgingContractABI = `[
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
