import { configureStore } from '@reduxjs/toolkit'
import isLoggedInSlice from './slices/isLoggedInSlice'

export const store = configureStore({
	reducer: {
		isLoggedIn: isLoggedInSlice,
	},
	middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
