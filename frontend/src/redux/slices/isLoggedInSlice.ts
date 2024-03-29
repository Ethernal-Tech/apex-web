import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface IsLoggedInState {
	isLoggedIn: boolean
}

const initialState: IsLoggedInState = {
	isLoggedIn: false,
}

const isLoggedInSlice = createSlice({
	name: 'isLoggedIn',
	initialState,
	reducers: {
		setisLoggedInSliceAction: (state, action: PayloadAction<boolean>) => {
			state.isLoggedIn = action.payload
		},
	},
})

// Action creators are generated for each case reducer function
export const { setisLoggedInSliceAction } = isLoggedInSlice.actions

export default isLoggedInSlice.reducer
