import { BrowserWallet, Wallet } from '@meshsdk/core';

const SUPPORTED_WALLETS = ['eternl']

let enabledWallet: BrowserWallet | undefined
let address: string | undefined

const getInstalledWallets = () => BrowserWallet.getInstalledWallets();

const getSupportedWallets = () => getInstalledWallets()
    .filter(wallet => SUPPORTED_WALLETS.some(supportedWallet => wallet.name === supportedWallet))

const enable = async (walletName: string) => {
    enabledWallet = await BrowserWallet.enable(walletName);
    address = await enabledWallet.getChangeAddress();
    return enabledWallet;
}

const getEnabledWallet = () => enabledWallet;

const clearEnabledWallet = () => {
    enabledWallet = undefined
}

const checkWallet = (wallet: BrowserWallet): boolean => wallet && wallet instanceof BrowserWallet;

const getAddress = () => address

const WalletHandler = {
    getInstalledWallets,
    getSupportedWallets,
    enable,
    getEnabledWallet,
    clearEnabledWallet,
    checkWallet,
    getAddress,
}

export default WalletHandler;
export type { BrowserWallet, Wallet };