import Web3 from 'web3';

type Wallet = {
    name: string;
    icon: string;
    version: string;
};

export const EVM_SUPPORTED_WALLETS = [{
    name: 'MetaMask',
    icon: 'https://metamask.io/images/metamask-logo.png', // MetaMask icon URL
    version: 'N/A', // MetaMask does not provide API version directly
}]

class EvmWalletHandler {
    private web3: Web3 | undefined;

    constructor() {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
        }
    }

    getInstalledWallets = (): Wallet[] => {
        if (typeof window.ethereum === 'undefined') return [];

        return EVM_SUPPORTED_WALLETS;
    };

    enable = async () => {
        if (this.web3) {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            } catch (error) {
                console.error('User denied account access');
            }
        }
    };

    clearEnabledWallet = () => {
        this.web3 = undefined;
    };

    private _isEnabled = () => !!this.web3;

    checkWallet = (): boolean => this._isEnabled();

    private _checkWalletAndThrow = () => {
        if (!this.checkWallet()) {
            throw new Error('Wallet not enabled');
        }
    };

    // PROXY

    getChangeAddress = async (): Promise<string> => {
        this._checkWalletAndThrow();
        const accounts = await this.web3!.eth.getAccounts();
        return accounts[0];
    };

    getBalance = async (): Promise<string> => {
        this._checkWalletAndThrow();
        const accounts = await this.web3!.eth.getAccounts();
        const balance = await this.web3!.eth.getBalance(accounts[0]);
        return this.web3!.utils.fromWei(balance, 'wei');
    };

    // TODO - check what the network id will be
    getNetworkId = async (): Promise<bigint> => {
        this._checkWalletAndThrow();
        return await this.web3!.eth.net.getId();
    };

    /* signTx = async (unsignedTx: any): Promise<SignedTransactionInfoAPI> => {
        this._checkWalletAndThrow();
        // const accounts = await this.web3!.eth.getAccounts();
        return await this.web3!.eth.signTransaction(unsignedTx);
    };

    submitTx = async (signedTx: string): Promise<string> => {
        this._checkWalletAndThrow();
        return (await this.web3!.eth.sendSignedTransaction(signedTx)).transactionHash as string;
    }; */
        
    submitTx = async (tx:any) =>{
        this._checkWalletAndThrow();
        await this.web3!.eth.sendTransaction(tx);
    }
}

const evmWalletHandler = new EvmWalletHandler();
export default evmWalletHandler;
