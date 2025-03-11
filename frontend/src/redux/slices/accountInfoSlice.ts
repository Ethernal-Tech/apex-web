import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { UTxO } from '@meshsdk/core';
import { ApexBridgeNetwork } from '../../features/enums';

export interface IAccountInfoState {
	account: string,
	networkId: number|bigint,
	network: ApexBridgeNetwork | undefined,
	balance: { [key: string]: string },
	utxos?: UTxO[],
}

export interface IBalanceState {
    balance: { [key: string]: string },
    utxos?: UTxO[],
}

const initialState: IAccountInfoState = {
	account: '',
	networkId: 0,
	network: undefined,
	balance: {},
	utxos: undefined
}

const accountInfoSlice = createSlice({
	name: 'accountInfo',
	initialState,
	reducers: {
		setAccountInfoAction: (state, action: PayloadAction<IAccountInfoState>) => {
			state.account = action.payload.account;
			state.networkId = action.payload.networkId;
			state.network = action.payload.network;
			state.balance = action.payload.balance;
			state.utxos = action.payload.utxos;
		},
		updateBalanceAction: (state, action: PayloadAction<IBalanceState>) => {
            state.balance = action.payload.balance;
            state.utxos = action.payload.utxos;
		},
		removeAccountInfoAction: (state) => {
			state.account = '';
			state.networkId = 0;
			state.network = undefined;
			state.balance = {};
			state.utxos = undefined;
		},
	},
})

// Action creators are generated for each case reducer function
export const { setAccountInfoAction, updateBalanceAction, removeAccountInfoAction } = accountInfoSlice.actions

export default accountInfoSlice.reducer
