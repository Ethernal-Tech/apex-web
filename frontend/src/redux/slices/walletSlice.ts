import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getSelectedWallet, removeSelectedWallet, setSelectedWallet } from '../../utils/storageUtils'

export interface IAccountInfo {
	account: string,
	networkId: number,
	balance: string,
}

export interface IWalletState {
	wallet: string | null
	accountInfo: IAccountInfo | undefined
}

const initialState: IWalletState = {
	wallet: getSelectedWallet(),
	accountInfo: undefined,
}

const walletSlice = createSlice({
	name: 'wallet',
	initialState,
	reducers: {
		setWalletAction: (state, action: PayloadAction<string>) => {
			setSelectedWallet(action.payload);
			state.wallet = action.payload;
		},
		removeWalletAction: (state) => {
			removeSelectedWallet();
			state.wallet = null;
		},
		setAccountInfoAction: (state, action: PayloadAction<IAccountInfo>) => {
			state.accountInfo = action.payload;
		},
		updateBalanceAction: (state, action: PayloadAction<string>) => {
			if (state.accountInfo) {
				state.accountInfo.balance = action.payload;
			}
		},
		removeAccountInfoAction: (state) => {
			state.accountInfo = undefined;
		},
	},
})

// Action creators are generated for each case reducer function
export const { setWalletAction, removeWalletAction, setAccountInfoAction, updateBalanceAction, removeAccountInfoAction } = walletSlice.actions

export default walletSlice.reducer
