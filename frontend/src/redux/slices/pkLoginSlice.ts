import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { PKLoginDto, getPKLogin, removePKLogin, setPKLogin } from '../../utils/storageUtils'

export interface IPKLoginState {
	pkLogin: PKLoginDto | null
}

const initialState: IPKLoginState = {
	pkLogin: getPKLogin(),
}

const pkLoginSlice = createSlice({
	name: 'pkLogin',
	initialState,
	reducers: {
		setPKLoginAction: (state, action: PayloadAction<PKLoginDto>) => {
			setPKLogin(action.payload);
			state.pkLogin = action.payload;
		},
		removePKLoginAction: (state) => {
			removePKLogin();
			state.pkLogin = null;
		}
	},
})

// Action creators are generated for each case reducer function
export const { setPKLoginAction, removePKLoginAction } = pkLoginSlice.actions

export default pkLoginSlice.reducer
