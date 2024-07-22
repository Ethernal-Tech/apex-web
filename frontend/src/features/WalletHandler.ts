import { BrowserWallet, Wallet } from '@meshsdk/core';

const SUPPORTED_WALLETS = ['eternl']

let enabledWallet: BrowserWallet | undefined

const getInstalledWallets = () => BrowserWallet.getInstalledWallets();

const getSupportedWallets = () => getInstalledWallets()
    .filter(wallet => SUPPORTED_WALLETS.some(supportedWallet => wallet.name === supportedWallet))

const enable = async (walletName: string) => {
    enabledWallet = await BrowserWallet.enable(walletName);
    return enabledWallet;
}

const getEnabledWallet = () => enabledWallet;

const clearEnabledWallet = () => {
    enabledWallet = undefined
}

const checkWallet = (wallet: BrowserWallet): boolean => wallet && wallet instanceof BrowserWallet;

const WalletHandler = {
    getInstalledWallets,
    getSupportedWallets,
    enable,
    getEnabledWallet,
    clearEnabledWallet,
    checkWallet,
}

export default WalletHandler;
export type { BrowserWallet, Wallet };