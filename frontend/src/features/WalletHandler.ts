import { BrowserWallet, Asset, UTxO } from '@meshsdk/core';
import { NewAddressFromBytes } from './Address/addreses';
import { getAssetsSumMap, toBytes } from '../utils/generalUtils';
import { ApexBridgeNetwork } from './enums';
import { UtxoRetriever } from './types';

type Wallet = {
    name: string;
    icon: string;
    version: string;
};

export const SUPPORTED_WALLETS = ['eternl']
export type EternlNetworkId = 'mainnet' | 'guild' | 'sancho' | 'preprod' | 'preview' | 'afvt' | 'afvm' | 'afpt' | 'afpm';

class WalletHandler implements UtxoRetriever {
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

    getNetwork = async (): Promise<ApexBridgeNetwork | undefined> => {
        this._checkWalletAndThrow();

        try {
            const nativeAPI = this.getNativeAPI();
            const experimentalAPI = nativeAPI['experimental'];
            if (!experimentalAPI) {
                throw new Error('experimental not defined');
            }

            const getConnectedNetworkId = experimentalAPI['getConnectedNetworkId'];
            if (!getConnectedNetworkId) {
                throw new Error('getConnectedNetworkId not defined');
            }

            const eternlNetworkId = await getConnectedNetworkId();
            return ETERNL_NETWORK_ID_TO_APEX_BRIDGE_NETWORK[eternlNetworkId];
        } catch (e) {
            console.log(e)
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

    getAllUtxos = async (): Promise<UTxO[]> => {
        this._checkWalletAndThrow();

        const address = await this.getChangeAddress();

        const allUtxosMap: {[key: string]: UTxO} = {};

        const utxos = await this._enabledWallet!.getUtxos()
        for (let i = 0; i < utxos.length; ++i) {
            const utxo = utxos[i];

            if (utxo.output.address === address) {
                allUtxosMap[`${utxo.input.txHash}#${utxo.input.outputIndex}`] = utxo;
            }
        }

        const collateralUtxos = await this._enabledWallet!.getCollateral();
        for (let i = 0; i < collateralUtxos.length; ++i) {
            const utxo = collateralUtxos[i];

            if (utxo.output.address === address) {
                allUtxosMap[`${utxo.input.txHash}#${utxo.input.outputIndex}`] = utxo;
            }
        }

        return Object.values(allUtxosMap);
    }

    getBalance = async (allUtxos?: UTxO[]): Promise<{[unit: string]: bigint}> => {
        if (allUtxos === undefined) {
            allUtxos = await this.getAllUtxos();
        }

        return getAssetsSumMap(allUtxos);
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
export type { BrowserWallet, Wallet, Asset, UTxO };

const ETERNL_NETWORK_ID_TO_APEX_BRIDGE_NETWORK: {[key: string]: ApexBridgeNetwork} = {
    'mainnet': ApexBridgeNetwork.MainnetCardano,
    'preview': ApexBridgeNetwork.PreviewCardano,
    'afvt': ApexBridgeNetwork.TestnetVector,
    'afvm': ApexBridgeNetwork.MainnetVector,
    'afpt': ApexBridgeNetwork.TestnetPrime,
    'afpm': ApexBridgeNetwork.MainnetPrime,
}