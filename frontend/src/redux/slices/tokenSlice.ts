import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { TokenDto } from '../../swagger/apexBridgeApiService'
import { getToken, removeToken, setToken } from '../../utils/storageUtils'

export interface ITokenState {
	token: TokenDto | null
}

const initialState: ITokenState = {
	token: getToken(),
}

const tokenSlice = createSlice({
	name: 'token',
	initialState,
	reducers: {
		setTokenAction: (state, action: PayloadAction<TokenDto>) => {
			setToken(action.payload);
			state.token = action.payload;
		},
		removeTokenAction: (state) => {
			removeToken();
			state.token = null;
		}
	},
})

// Action creators are generated for each case reducer function
export const { setTokenAction, removeTokenAction } = tokenSlice.actions

export default tokenSlice.reducer
