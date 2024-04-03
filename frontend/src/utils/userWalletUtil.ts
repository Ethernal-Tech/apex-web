import { Address, BaseAddress, RewardAddress } from '@emurgo/cardano-serialization-lib-browser';
import { BrowserWallet } from '@meshsdk/core';

export const getStakeAddress = async (wallet: BrowserWallet) =>{
    const networkId = await wallet.getNetworkId();
    const changeAddr = await wallet.getChangeAddress();
    
    // derive the stake address from the change address to be sure we are getting
    // the stake address of the currently active account.
    const changeAddress = Address.from_bech32(changeAddr);
    const stakeCredential = BaseAddress.from_address(changeAddress)!.stake_cred();
    const stakeAddress = RewardAddress.new(networkId, stakeCredential).to_address();

    return stakeAddress;
}