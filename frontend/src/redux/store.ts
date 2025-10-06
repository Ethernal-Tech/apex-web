import { configureStore } from '@reduxjs/toolkit'
import pkLoginSlice from './slices/pkLoginSlice'
import walletSlice from './slices/walletSlice'
import chainSlice from './slices/chainSlice'
import loginSlice from './slices/loginSlice'
import accountInfoSlice from './slices/accountInfoSlice'
import settingsSlice from './slices/settingsSlice'
import lockedTokensSlice from './slices/lockedTokensSlice'
import layerZeroSlice from './slices/layerZeroSlice'

export const store = configureStore({
	reducer: {
		pkLogin: pkLoginSlice,
		wallet: walletSlice,
		accountInfo: accountInfoSlice,
		chain: chainSlice,
		login: loginSlice,
		settings: settingsSlice,
		lockedTokens: lockedTokensSlice,
		layerZeroLockedTokens: layerZeroSlice
	},
	middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
