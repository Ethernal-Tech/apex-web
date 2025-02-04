import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { UTxO } from '@meshsdk/core';

export interface IAccountInfoState {
	account: string,
	networkId: number|bigint,
	balance: string,
	utxos?: UTxO[],
}

export interface IBalanceState {
	balance: string,
	utxos?: UTxO[],
}

const initialState: IAccountInfoState = {
	account: '',
	networkId: 0,
	balance: '0',
	utxos: undefined,
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
		updateBalanceAction: (state, action: PayloadAction<IBalanceState>) => {
            state.balance = action.payload.balance;
            state.utxos = action.payload.utxos;
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
