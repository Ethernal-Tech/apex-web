import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface IAccountInfoState {
	account: string,
	networkId: number,
	balance: string,
}

const initialState: IAccountInfoState = {
	account: '',
	networkId: 0,
	balance: '0',
}

const accountInfoSlice = createSlice({
	name: 'accountInfo',
	initialState,
	reducers: {
		setAccountInfoAction: (state, action: PayloadAction<IAccountInfoState>) => {
			state.account = action.payload.account;
			state.networkId = action.payload.networkId;
			state.balance = action.payload.balance;
		},
		updateBalanceAction: (state, action: PayloadAction<string>) => {
            state.balance = action.payload;
		},
		removeAccountInfoAction: (state) => {
			state.account = '';
			state.networkId = 0;
			state.balance = '0';
		},
	},
})

// Action creators are generated for each case reducer function
export const { setAccountInfoAction, updateBalanceAction, removeAccountInfoAction } = accountInfoSlice.actions

export default accountInfoSlice.reducer
