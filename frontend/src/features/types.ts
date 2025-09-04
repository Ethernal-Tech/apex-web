import { ChainEnum } from "../swagger/apexBridgeApiService"
import { UTxO } from "./WalletHandler"

export type StepType = {
  label: string,
  status: 'success' | 'pending' | 'rejected',
  active: boolean
}

export interface UtxoRetriever {
  getAllUtxos(): Promise<UTxO[]>
  getBalance(allUtxos?: UTxO[]): Promise<{ [unit: string]: bigint }>
}

export type LayerZeroTransferResponse = {
  dstChainName: ChainEnum;
  metadata: {
    properties: {
      approvalRequired: boolean;
      dstChainName: ChainEnum;
      amount: string;
    };
  };
  transactionData: {
    approvalTransaction?: {
      to: string;
      data: string;
      gasLimit?: string;
    };
    populatedTransaction: {
      to: string;
      data: string;
      gasLimit?: string;
      value?: string;
    };
  };
};

export type SendParams = {
  dstEid: string | number;    
  to: string;                      
  amountLD: string;                
  minAmountLD: string;              
  extraOptions: string;             
  composeMsg: string;              
  oftCmd: string;                   
};