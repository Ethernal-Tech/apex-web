import Web3 from 'web3';
import { Transaction } from 'web3-types';

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
    private onAccountsChanged: (accounts: string[]) => Promise<void> = async () => undefined

    getInstalledWallets = (): Wallet[] => {
        if (typeof window.ethereum === 'undefined') return [];

        return EVM_SUPPORTED_WALLETS;
    };

    accountsChanged = async (accounts: string[]) => await this.onAccountsChanged(accounts)

    enable = async (onAccountsChanged: (accounts: string[]) => Promise<void>) => {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            this.web3.transactionBlockTimeout = 200;
        }

        if (this.web3) {
            this.onAccountsChanged = onAccountsChanged
            window.ethereum.on('accountsChanged', this.accountsChanged)

            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            } catch (error) {
                console.error('User denied account access');
            }
        }
    };

    clearEnabledWallet = () => {
        this.web3 = undefined;
        window.ethereum.removeListener('accountsChanged', this.accountsChanged)
    };

    private _isEnabled = () => !!this.web3;

    checkWallet = (): boolean => this._isEnabled();

    private _checkWalletAndThrow = () => {
        if (!this.checkWallet()) {
            throw new Error('Wallet not enabled');
        }
    };

    // PROXY

    getAddress = async (): Promise<string | undefined> => {
        this._checkWalletAndThrow();
        const accounts = await this.web3!.eth.getAccounts();
        return accounts.length > 0 ? accounts[0] : undefined;
    };

    getBalance = async (): Promise<string> => {
        this._checkWalletAndThrow();
        const accounts = await this.web3!.eth.getAccounts();
        const balance = await this.web3!.eth.getBalance(accounts[0]);
        return this.web3!.utils.fromWei(balance, 'wei');
    };

    getNetworkId = async (): Promise<bigint> => {
        this._checkWalletAndThrow();
        return await this.web3!.eth.net.getId();
    };
        
    submitTx = async (tx:Transaction) =>{
        this._checkWalletAndThrow();
        return await this.web3!.eth.sendTransaction(tx);
    }

    estimateGas = async (tx:Transaction) =>{
        this._checkWalletAndThrow();
        return await this.web3!.eth.estimateGas(tx);
    }

    getGasPrice = async () =>{
        this._checkWalletAndThrow();
        return await this.web3!.eth.getGasPrice();
    }
}

const evmWalletHandler = new EvmWalletHandler();
export default evmWalletHandler;
