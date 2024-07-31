import { ChainEnum, WalletControllerClient } from '../swagger/apexBridgeApiService';


export const getWalletBalanceAction = (chain: ChainEnum, address: string) => {
    const client = new WalletControllerClient();
    return client.getBalance(chain, address);
} 