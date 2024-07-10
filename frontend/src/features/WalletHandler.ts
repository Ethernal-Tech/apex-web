import { Address, BaseAddress, RewardAddress } from '@emurgo/cardano-serialization-lib-browser';
import { BrowserWallet, Wallet } from '@meshsdk/core';

let enabledWallet: BrowserWallet

const getInstalledWallets = () => BrowserWallet.getInstalledWallets();

const enable = async (walletName: string) => {
    enabledWallet = await BrowserWallet.enable(walletName);
    return enabledWallet;
}

const getEnabledWallet = () => enabledWallet;

const checkWallet = (wallet: BrowserWallet): boolean => wallet && wallet instanceof BrowserWallet;

const getStakeAddress = async (wallet: BrowserWallet) =>{
    const networkId = await wallet.getNetworkId();
    const changeAddr = await wallet.getChangeAddress();
    
    // derive the stake address from the change address to be sure we are getting
    // the stake address of the currently active account.
    const changeAddress = Address.from_bech32(changeAddr);
    const stakeCredential = BaseAddress.from_address(changeAddress)!.stake_cred();
    const stakeAddress = RewardAddress.new(networkId, stakeCredential).to_address();

    return stakeAddress;
}

const WalletHandler = {
    getInstalledWallets,
    enable,
    getEnabledWallet,
    checkWallet,
    getStakeAddress,
}

export default WalletHandler;
export type { BrowserWallet, Wallet };