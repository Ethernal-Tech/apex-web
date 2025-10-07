import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { TotalLockedLZ } from '../../features/types'

export interface IChainState {
    lockedTokens: bigint
}

const initialState: IChainState = {
    lockedTokens: BigInt(0)
}

const layerZeroLockedSlice = createSlice({
    name: 'lockedTokensLZ',
    initialState,
    reducers: {
        setLayerZeroLockedAction: (state, action: PayloadAction<bigint>) => {
            state.lockedTokens = action.payload
        },
    },
})

// Action creators are generated for each case reducer function
export const { setLayerZeroLockedAction } = layerZeroLockedSlice.actions

export default layerZeroLockedSlice.reducer
