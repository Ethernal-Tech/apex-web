import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LockedTokensDto } from "../../swagger/apexBridgeApiService";

export interface ILockedTokensState {
  chains: { [key: string]: { [innerKey: string]: bigint } };
  totalTransferred: { [key: string]: { [innerKey: string]: bigint } };
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
      const safeParseBigInt = (val: string | undefined): bigint => {
        try {
          if (!val || isNaN(Number(val))) return BigInt(0);
          return BigInt(val);
        } catch {
          return BigInt(0);
        }
      };

      state.chains = Object.entries(action.payload.chains).reduce(
        (acc, [key, tokens]) => {
          acc[key] = Object.entries(tokens).reduce(
            (tokenAcc, [innerKey, value]) => {
              tokenAcc[innerKey] = safeParseBigInt(value);
              return tokenAcc;
            },
            {} as { [innerKey: string]: bigint }
          );
          return acc;
        },
        {} as { [key: string]: { [tokenKey: string]: bigint } }
      );

      state.totalTransferred = Object.entries(
        action.payload.totalTransfered
      ).reduce((acc, [key, tokens]) => {
        acc[key] = Object.entries(tokens).reduce(
          (tokenAcc, [innerKey, value]) => {
            tokenAcc[innerKey] = safeParseBigInt(value);
            return tokenAcc;
          },
          {} as { [innerKey: string]: bigint }
        );
        return acc;
      }, {} as { [key: string]: { [tokenKey: string]: bigint } });
    },
  },
});

// Action creators are generated for each case reducer function
export const { setLockedTokensAction } = lockedTokensSlice.actions;

export default lockedTokensSlice.reducer;
