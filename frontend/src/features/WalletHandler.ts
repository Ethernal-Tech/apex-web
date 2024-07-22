import { BrowserWallet } from '@meshsdk/core';

type Wallet = {
    name: string;
    icon: string;
    version: string;
};

const SUPPORTED_WALLETS = ['eternl']

class WalletHandler {
    private _enabledWallet: BrowserWallet | undefined;

    getNativeAPI = () => (this._enabledWallet as any)?._walletInstance;

    getInstalledWallets = (): Wallet[] =>  {
        if (window.cardano === undefined) return [];
    
        return SUPPORTED_WALLETS.filter(
            (sw) => window.cardano[sw] !== undefined
        ).map((sw) => ({
            name: window.cardano[sw].name,
            icon: window.cardano[sw].icon,
            version: window.cardano[sw].apiVersion,
        }));
    };

    enable = async (walletName: string) => {
        this._enabledWallet = await BrowserWallet.enable(walletName);
        return this._enabledWallet;
    }

    getEnabledWallet = () => this._enabledWallet;

    clearEnabledWallet = () => {
        this._enabledWallet = undefined;
    }

    checkWallet = (wallet: any): boolean => wallet && wallet instanceof BrowserWallet;
}

const walletHandler = new WalletHandler();
export default walletHandler;
export type { BrowserWallet, Wallet };