import { BrowserWallet, Asset, UTxO } from '@meshsdk/core';
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

    _getAllUtxos = async (): Promise<UTxO[]> => {
        this._checkWalletAndThrow();

        const allUtxosMap: {[key: string]: UTxO} = {};

        const utxos = await this._enabledWallet!.getUtxos()
        for (let i = 0; i < utxos.length; ++i) {
            const utxo = utxos[i];

            allUtxosMap[`${utxo.input.txHash}#${utxo.input.outputIndex}`] = utxo;
        }

        const collateralUtxos = await this._enabledWallet!.getCollateral();
        for (let i = 0; i < collateralUtxos.length; ++i) {
            const utxo = collateralUtxos[i];

            allUtxosMap[`${utxo.input.txHash}#${utxo.input.outputIndex}`] = utxo;
        }

        return Object.values(allUtxosMap);
    }

    getBalance = async (): Promise<{[unit: string]: bigint}> => {
        const allUtxos = await this._getAllUtxos();

        const assetsSumMap: { [unit: string]: bigint } = {}
        for (let j = 0; j < allUtxos.length; ++j) {
            const assets = allUtxos[j].output.amount;
            
            for (let i = 0; i < assets.length; ++i) {
                const asset = assets[i];
    
                if (!assetsSumMap[asset.unit]) {
                    assetsSumMap[asset.unit] = BigInt(0);
                }
    
                assetsSumMap[asset.unit] += BigInt(asset?.quantity || "0");
            }
        }

        return assetsSumMap;
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