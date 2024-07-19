import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getSelectedWallet, removeSelectedWallet, setSelectedWallet } from '../../utils/storageUtils'

export interface IWalletState {
	wallet: string | null
}

const initialState: IWalletState = {
	wallet: getSelectedWallet(),
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
		}
	},
})

// Action creators are generated for each case reducer function
export const { setWalletAction, removeWalletAction } = walletSlice.actions

export default walletSlice.reducer
