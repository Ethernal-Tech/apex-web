import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
	initChainsState,
	setDestinationChain,
	setSelectedChain,
} from '../../utils/storageUtils';
import { ChainEnum } from '../../swagger/apexBridgeApiService';

export interface IChainState {
	chain: ChainEnum;
	destinationChain: ChainEnum;
}

const { chain, destinationChain } = initChainsState();

const initialState: IChainState = {
	chain: chain,
	destinationChain: destinationChain,
};

const chainSlice = createSlice({
	name: 'chain',
	initialState,
	reducers: {
		setChainAction: (state, action: PayloadAction<ChainEnum>) => {
			setSelectedChain(action.payload);
			state.chain = action.payload;
		},
		setDestinationChainAction: (
			state,
			action: PayloadAction<ChainEnum>,
		) => {
			setDestinationChain(action.payload);
			state.destinationChain = action.payload;
		},
	},
});

// Action creators are generated for each case reducer function
export const { setChainAction, setDestinationChainAction } = chainSlice.actions;

export default chainSlice.reducer;
