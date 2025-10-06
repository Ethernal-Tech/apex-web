import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { TotalSupply } from '../../features/types'

export interface IChainState {
    lockedTokens: TotalSupply[]
}

const initialState: IChainState = {
    lockedTokens: []
}

const layerZeroLockedSlice = createSlice({
    name: 'chain',
    initialState,
    reducers: {
        setLayerZeroLockedAction: (state, action: PayloadAction<TotalSupply[]>) => {
            state.lockedTokens = action.payload
        },
    },
})

// Action creators are generated for each case reducer function
export const { setLayerZeroLockedAction } = layerZeroLockedSlice.actions

export default layerZeroLockedSlice.reducer
