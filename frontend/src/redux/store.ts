import { configureStore } from '@reduxjs/toolkit';
import walletSlice from './slices/walletSlice';
import chainSlice from './slices/chainSlice';
import loginSlice from './slices/loginSlice';
import accountInfoSlice from './slices/accountInfoSlice';
import settingsSlice from './slices/settingsSlice';

export const store = configureStore({
	reducer: {
		wallet: walletSlice,
		accountInfo: accountInfoSlice,
		chain: chainSlice,
		login: loginSlice,
		settings: settingsSlice,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({ serializableCheck: false }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
