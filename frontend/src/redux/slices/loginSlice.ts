import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface ILoginState {
	connecting: boolean
}

const initialState: ILoginState = {
	connecting: false,
}

const loginSlice = createSlice({
	name: 'login',
	initialState,
	reducers: {
		setConnectingAction: (state, action: PayloadAction<boolean>) => {
			state.connecting = action.payload;
		},
	},
})

// Action creators are generated for each case reducer function
export const { setConnectingAction } = loginSlice.actions

export default loginSlice.reducer
