import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LockedTokensDto } from "../../swagger/apexBridgeApiService";

export interface ILockedTokensState {
  chains: { [chain: string]: { [token: string]: { [address: string]: bigint } } };
  totalTransferred: { [chain: string]: { [token: string]: bigint } };
  totalTransferredLayerZero: { [chain: string]: { [token: string]: bigint } };
}

const initialState: ILockedTokensState = {
  chains: {},
  totalTransferred: {},
  totalTransferredLayerZero: {}
};

const lockedTokensSlice = createSlice({
name: "lockedTokens",
  initialState,
  reducers: {
    setLockedTokensAction: (state, action: PayloadAction<LockedTokensDto>) => {
      const safeParseBigInt = (val: string | undefined): bigint => {
        try {
          // keep string parsing to avoid Number precision issues
          return BigInt(val ?? "0");
        } catch {
          return BigInt(0);
        }
      };


      state.chains = Object.entries(action.payload.chains).reduce(
        (chainsAcc, [chainId, tokenMap]) => {
          chainsAcc[chainId] = Object.entries(tokenMap).reduce(
            (tokenAcc, [token, addrMap]) => {
              tokenAcc[token] = Object.entries(addrMap).reduce(
                (addrAcc, [address, amountStr]) => {
                  addrAcc[address] = safeParseBigInt(amountStr);
                  return addrAcc;
                },
                {} as { [address: string]: bigint }
              );
              return tokenAcc;
            },
            {} as { [token: string]: { [address: string]: bigint } }
          );
          return chainsAcc;
        },
        {} as { [chain: string]: { [token: string]: { [address: string]: bigint } } }
      );

      // totalTransferred: chain -> token -> bigint
      state.totalTransferred = Object.entries(action.payload.totalTransferred).reduce(
        (chainsAcc, [chainId, tokenMap]) => {
          chainsAcc[chainId] = Object.entries(tokenMap).reduce(
            (tokenAcc, [token, amountStr]) => {
              tokenAcc[token] = safeParseBigInt(amountStr);
              return tokenAcc;
            },
            {} as { [token: string]: bigint }
          );
          return chainsAcc;
        },
        {} as { [chain: string]: { [token: string]: bigint } }
      );

            // totalTransferred: chain -> token -> bigint
      state.totalTransferredLayerZero = Object.entries(action.payload.totalTransferredLayerZero).reduce(
        (chainsAcc, [chainId, tokenMap]) => {
          chainsAcc[chainId] = Object.entries(tokenMap).reduce(
            (tokenAcc, [token, amountStr]) => {
              tokenAcc[token] = safeParseBigInt(amountStr);
              return tokenAcc;
            },
            {} as { [token: string]: bigint }
          );
          return chainsAcc;
        },
        {} as { [chain: string]: { [token: string]: bigint } }
      );
    },
  },
});

// Action creators are generated for each case reducer function
export const { setLockedTokensAction } = lockedTokensSlice.actions;

export default lockedTokensSlice.reducer;
