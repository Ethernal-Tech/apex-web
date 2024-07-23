import { configureStore } from '@reduxjs/toolkit'
import pkLoginSlice from './slices/pkLoginSlice'
import walletSlice from './slices/walletSlice'
import chainSlice from './slices/chainSlice'

export const store = configureStore({
	reducer: {
		pkLogin: pkLoginSlice,
		wallet: walletSlice,
		chain: chainSlice,
	},
	middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
