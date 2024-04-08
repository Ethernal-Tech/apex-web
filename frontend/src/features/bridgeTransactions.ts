import { BridgeTransactionType } from "./types";

export const bridgeTransactions: BridgeTransactionType[] = [
    {
      id: "a83a3e50-b68f-4f7e-8813-f41c7ac5e142",
      originChain: "Ethereum",
      destinationChain: "Binance Smart Chain",
      amount: "10.123456",
      date: "2024-04-01",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id: '09140914-1254-4f6d-a456-e51afbfa27cb',
      originChain: "Bitcoin",
      destinationChain: "Ethereum",
      amount: "5.678901",
      date: "2024-04-02",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: true
        },
        {
          label: "Step 2",
          status: "pending",
          active: false
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: 'd10d4407-72e7-48e7-85d2-97c450c240f9',
      originChain: "Ethereum",
      destinationChain: "Polygon",
      amount: "8.901234",
      date: "2024-04-03",
      status: "rejected",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "rejected",
          active: true
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: 'e258102b-b068-4330-977c-d5cb3a66d7a5',
      originChain: "Binance Smart Chain",
      destinationChain: "Ethereum",
      amount: "15.432109",
      date: "2024-04-04",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id:  'd67081c9-3c40-4a59-b311-d95568417a2a',
      originChain: "Ethereum",
      destinationChain: "Solana",
      amount: "12.789012",
      date: "2024-04-05",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: true
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: '8c4b89b4-4a53-4a05-bddd-3f4987b577b2',
      originChain: "Solana",
      destinationChain: "Ethereum",
      amount: "20.004567",
      date: "2024-04-06",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id: '08e72952-2231-4513-a2a6-699729230ce6',
      originChain: "Ethereum",
      destinationChain: "Binance Smart Chain",
      amount: "10.123456",
      date: "2024-04-01",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id:  '5169abd5-4891-478c-a6c0-69535d0d952e',
      originChain: "Bitcoin",
      destinationChain: "Ethereum",
      amount: "5.678901",
      date: "2024-04-02",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: true
        },
        {
          label: "Step 2",
          status: "pending",
          active: false
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: '0259d3d2-3c61-4f58-998a-2633f95d7f82',
      originChain: "Ethereum",
      destinationChain: "Polygon",
      amount: "8.901234",
      date: "2024-04-03",
      status: "rejected",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "rejected",
          active: true
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: '12834d5b-2221-4f00-9415-61c0f49ef981',
      originChain: "Binance Smart Chain",
      destinationChain: "Ethereum",
      amount: "15.432109",
      date: "2024-04-04",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id: '26a8cb02-55a3-4898-8f70-972d53290d4b',
      originChain: "Ethereum",
      destinationChain: "Solana",
      amount: "12.789012",
      date: "2024-04-05",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: true
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: '2201c64d-c100-466f-8f83-6a5830932f24',
      originChain: "Solana",
      destinationChain: "Ethereum",
      amount: "20.004567",
      date: "2024-04-06",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id:  '1c701086-1089-4d6d-9833-f6f4f6d19e18',
      originChain: "Ethereum",
      destinationChain: "Binance Smart Chain",
      amount: "10.123456",
      date: "2024-04-01",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id: '59623110-12d8-4081-9977-e293cc39d02b',
      originChain: "Bitcoin",
      destinationChain: "Ethereum",
      amount: "5.678901",
      date: "2024-04-02",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: true
        },
        {
          label: "Step 2",
          status: "pending",
          active: false
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: 'f996a76c-3ac9-4cbd-8b13-65431b654611',
      originChain: "Ethereum",
      destinationChain: "Polygon",
      amount: "8.901234",
      date: "2024-04-03",
      status: "rejected",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "rejected",
          active: true
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: '8bb8e0a0-5039-4b58-94cf-438e36c17781',
      originChain: "Binance Smart Chain",
      destinationChain: "Ethereum",
      amount: "15.432109",
      date: "2024-04-04",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id: 'e1a92c21-6865-499c-b40d-17c24b530057',
      originChain: "Ethereum",
      destinationChain: "Solana",
      amount: "12.789012",
      date: "2024-04-05",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: true
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: '796433d2-4f9c-4c4e-9e52-4e5896d25929',
      originChain: "Solana",
      destinationChain: "Ethereum",
      amount: "20.004567",
      date: "2024-04-06",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id:  '26859e6a-a585-4b19-b97a-2020450f38c1',
      originChain: "Ethereum",
      destinationChain: "Binance Smart Chain",
      amount: "10.123456",
      date: "2024-04-01",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id: '3a8759aa-7238-4c85-bd81-9977a3c581f7',
      originChain: "Bitcoin",
      destinationChain: "Ethereum",
      amount: "5.678901",
      date: "2024-04-02",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: true
        },
        {
          label: "Step 2",
          status: "pending",
          active: false
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: '43709371-89b3-4e57-839e-34a371432761',
      originChain: "Ethereum",
      destinationChain: "Polygon",
      amount: "8.901234",
      date: "2024-04-03",
      status: "rejected",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "rejected",
          active: true
        }
      ]
    },
    {
      id:  '376176ba-5cf8-4415-b27b-539a57610099',
      originChain: "Binance Smart Chain",
      destinationChain: "Ethereum",
      amount: "15.432109",
      date: "2024-04-04",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    },
    {
      id: '473743a3-924d-4b7a-984f-5de4dd8e083f',
      originChain: "Ethereum",
      destinationChain: "Solana",
      amount: "12.789012",
      date: "2024-04-05",
      status: "pending",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: true
        },
        {
          label: "Step 3",
          status: "pending",
          active: false
        }
      ]
    },
    {
      id: "299b1d78-b358-423c-879b-567j68d7bb20",
      originChain: "Solana",
      destinationChain: "Ethereum",
      amount: "20.004567",
      date: "2024-04-06",
      status: "success",
      steps: [
        {
          label: "Step 1",
          status: "success",
          active: false
        },
        {
          label: "Step 2",
          status: "success",
          active: false
        },
        {
          label: "Step 3",
          status: "success",
          active: false
        }
      ]
    }
]

export const getBridgeTransactions: (page: number, rowsPerPage: number) => Promise<BridgeTransactionType[] | undefined> = (page: number, rowsPerPage: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const transactions = bridgeTransactions.slice(page * rowsPerPage, (page+1) * rowsPerPage);
      if (transactions) {
        resolve(transactions);
      }
    }, Math.random() * 2000);
  });
};


export const getTransactionById: (id: string) => Promise<BridgeTransactionType | undefined> = (id: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const foundTransaction = bridgeTransactions.find(tx => tx.id === id);
      if (foundTransaction) {
        resolve(foundTransaction);
      }
    }, Math.random() * 2000);
  });
};
