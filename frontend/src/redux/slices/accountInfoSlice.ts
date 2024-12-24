import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface IAccountInfoState {
	account: string,
	networkId: number|bigint,
	balance: { [key: string]: string },
}

const initialState: IAccountInfoState = {
	account: '',
	networkId: 0,
	balance: {},
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
		updateBalanceAction: (state, action: PayloadAction<{ [key: string]: string }>) => {
            state.balance = action.payload;
		},
		removeAccountInfoAction: (state) => {
			state.account = '';
			state.networkId = 0;
			state.balance = {};
		},
	},
})

// Action creators are generated for each case reducer function
export const { setAccountInfoAction, updateBalanceAction, removeAccountInfoAction } = accountInfoSlice.actions

export default accountInfoSlice.reducer
