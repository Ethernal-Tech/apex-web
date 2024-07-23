import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getSelectedChain, setSelectedChain } from '../../utils/storageUtils'
import { ChainEnum } from '../../swagger/apexBridgeApiService'

export interface IChainState {
	chain: ChainEnum
}

const initialState: IChainState = {
	chain: getSelectedChain() || ChainEnum.Prime,
}

const chainSlice = createSlice({
	name: 'chain',
	initialState,
	reducers: {
		setChainAction: (state, action: PayloadAction<ChainEnum>) => {
			setSelectedChain(action.payload);
			state.chain = action.payload;
		},
	},
})

// Action creators are generated for each case reducer function
export const { setChainAction } = chainSlice.actions

export default chainSlice.reducer
