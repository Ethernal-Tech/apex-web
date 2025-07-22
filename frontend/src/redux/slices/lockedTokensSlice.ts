import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LockedTokensDto } from "../../swagger/apexBridgeApiService";

export interface ILockedTokensState {
  chains: { [key: string]: { [innerKey: string]: number } };
  totalTransferred: { [key: string]: { [innerKey: string]: number } };
}

const initialState: ILockedTokensState = {
  chains: {},
  totalTransferred: {},
};

const lockedTokensSlice = createSlice({
  name: "lockedTokens",
  initialState,
  reducers: {
    setLockedTokensAction: (state, action: PayloadAction<LockedTokensDto>) => {
      state.chains = Object.entries(action.payload.chains).reduce(
        (acc, [key, tokens]) => {
          acc[key] = Object.entries(tokens).reduce(
            (tokenAcc, [innerKey, value]) => {
              tokenAcc[innerKey] = Number(value); // or value as-is if it's already a number
              return tokenAcc;
            },
            {} as { [innerKey: string]: number }
          );
          return acc;
        },
        {} as { [key: string]: { [tokenKey: string]: number } }
      );
      state.totalTransferred = Object.entries(
        action.payload.totalTransfered
      ).reduce((acc, [key, tokens]) => {
        acc[key] = Object.entries(tokens).reduce(
          (tokenAcc, [innerKey, value]) => {
            tokenAcc[innerKey] = Number(value); // or value as-is if it's already a number
            return tokenAcc;
          },
          {} as { [innerKey: string]: number }
        );
        return acc;
      }, {} as { [key: string]: { [tokenKey: string]: number } });
    },
  },
});

// Action creators are generated for each case reducer function
export const { setLockedTokensAction } = lockedTokensSlice.actions;

export default lockedTokensSlice.reducer;
