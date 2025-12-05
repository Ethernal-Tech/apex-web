import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface INewTxState {
	sourceTokenID: number | undefined;
}

const initialState: INewTxState = {
	sourceTokenID: undefined,
};

const newTxSlice = createSlice({
	name: 'newTx',
	initialState,
	reducers: {
		setNewTxSourceTokenIDAction: (
			state,
			action: PayloadAction<number | undefined>,
		) => {
			state.sourceTokenID = action.payload;
		},
	},
});

// Action creators are generated for each case reducer function
export const { setNewTxSourceTokenIDAction } = newTxSlice.actions;

export default newTxSlice.reducer;
