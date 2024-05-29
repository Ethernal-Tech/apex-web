import { configureStore } from '@reduxjs/toolkit'
import tokenSlice from './slices/tokenSlice'
import pkLoginSlice from './slices/pkLoginSlice'

export const store = configureStore({
	reducer: {
		token: tokenSlice,
		pkLogin: pkLoginSlice,
	},
	middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
