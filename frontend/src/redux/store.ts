import { configureStore } from '@reduxjs/toolkit'
import tokenSlice from './slices/tokenSlice'
import pkLoginSlice from './slices/pkLoginSlice'
import walletSlice from './slices/walletSlice'
import networkSlice from './slices/networkSlice'

export const store = configureStore({
	reducer: {
		token: tokenSlice,
		pkLogin: pkLoginSlice,
		wallet: walletSlice,
		network: networkSlice
	},
	middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
