import { BrowserWallet, Asset } from '@meshsdk/core';
import { NewAddressFromBytes } from './Address/addreses';
import { toBytes } from '../utils/generalUtils';

type Wallet = {
    name: string;
    icon: string;
    version: string;
};

export const SUPPORTED_WALLETS = ['eternl']

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
    }

    clearEnabledWallet = () => {
        this._enabledWallet = undefined;
    }

    private _isEnabled = () => !!this._enabledWallet;

    checkWallet = (): boolean => this._isEnabled() && this._enabledWallet instanceof BrowserWallet;

    private _checkWalletAndThrow = () => {
        if (!this.checkWallet()) {
            throw new Error('Wallet not enabled')
        }
    }

    // PROXY

    getChangeAddress = async (): Promise<string> => {
        this._checkWalletAndThrow();

        try {
            const networkId = await this.getNetworkId();
            const nativeAPI = this.getNativeAPI();
            const changeAddr = await nativeAPI.getChangeAddress();
            const changeAddrBytes = toBytes(changeAddr);
            
            const addr = NewAddressFromBytes(changeAddrBytes);
            const realChangeAddr = addr?.String(networkId);
            if (realChangeAddr) {
                return realChangeAddr;
            }
        } catch (e) {
            console.log(e)
        }

        return await this._enabledWallet!.getChangeAddress()
    }

    getBalance = async (): Promise<string> => {
        this._checkWalletAndThrow();
        const assets = await this._enabledWallet!.getBalance();
        const lovelaceObject: Asset | undefined = assets.find(item => item.unit === 'lovelace')
        return lovelaceObject?.quantity || "0";
    }

    getNetworkId = async (): Promise<number> => {
        this._checkWalletAndThrow();
        return await this._enabledWallet!.getNetworkId();
    }

    signTx = async (unsignedTx: string, partialSign?: boolean): Promise<string> => {
        this._checkWalletAndThrow();
        return await this._enabledWallet!.signTx(unsignedTx, partialSign);
    }

    submitTx = async (tx: string): Promise<string> => {
        this._checkWalletAndThrow();
        return await this._enabledWallet!.submitTx(tx);
    };
}

const walletHandler = new WalletHandler();
export default walletHandler;
export type { BrowserWallet, Wallet, Asset };