import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { 
    getDestinationNetwork, 
    setDestinationNetwork, 
    resetDestinationNetwork, 
    
    getSourceNetwork, 
    setSourceNetwork,
    resetSourceNetwork, 

    default_source_network, 
    default_destination_network
} from '../../utils/storageUtils'

export interface INetworkState {
	network: {
        source: string
        destination: string
    }
}

const initialState: INetworkState = {
	network:{
        source: getSourceNetwork(),
        destination: getDestinationNetwork(),
    }
}

const networkSlice = createSlice({
	name: 'network',
	initialState,
	reducers: {
		setSourceNetworktAction: (state, action: PayloadAction<string>) => {
			setSourceNetwork(action.payload);
			state.network.source = action.payload;
		},
		setDestinationNetworktAction: (state, action: PayloadAction<string>) => {
            setDestinationNetwork(action.payload);
			state.network.destination = action.payload;
		},
		resetSourceNetworktAction: (state) => {
            resetSourceNetwork(default_source_network);
			state.network.source = default_source_network;
		},
		resetDestinationNetworktAction: (state) => {
            resetDestinationNetwork(default_destination_network);
			state.network.destination = default_destination_network;
		},
	},
})

// Action creators are generated for each case reducer function
export const { 
    setSourceNetworktAction, 
    setDestinationNetworktAction,
    resetSourceNetworktAction, 
    resetDestinationNetworktAction 
} = networkSlice.actions

export default networkSlice.reducer
