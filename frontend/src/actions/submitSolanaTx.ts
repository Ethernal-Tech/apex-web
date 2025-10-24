import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { ISettingsState } from "../settings/settingsRedux";
import { ChainEnum, TransactionSubmittedDto } from "../swagger/apexBridgeApiService";
import { validateSubmitTxInputs } from "../utils/validationUtils";
import { AnchorProvider, BN, Program, setProvider } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { SkylineProgram } from "../features/Solana/types";
import { UpdateSubmitLoadingState } from "../utils/statusUtils";
import solanaWalletHandler from "../features/SolanaWalletHandler";
import { bridgingTransactionSubmittedAction } from "../pages/Transactions/action";
import { tryCatchJsonByAction, ErrorResponse } from "../utils/fetchUtils";
import skylineProgram from "../features/Solana/idl.json";

type WalletLike = {
  publicKey: PublicKey;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
};

const readonlyWallet = (pubkey: PublicKey): WalletLike => ({
  publicKey: pubkey,
  // no-op signers so Program can be constructed; you won’t use them
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
});

export const signAndSubmitSolanaTx = async (
  data: SolanaData,
  updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
  if (!solanaWalletHandler.checkWallet()) {
      throw new Error('Wallet not connected.');
  }

  updateLoadingState({ content: 'Signing and submitting the transaction...' });


  console.log('submitting solana tx...', data.tx);

  const walletResponse = await solanaWalletHandler.submitTx(data.tx);

  updateLoadingState({ content: 'Recording the transaction...', txHash: walletResponse })

  

  const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
      originChain: data.srcChain,
      destinationChain: data.dstChain,
      originTxHash: walletResponse.signature,
      senderAddress: data.fromAddr,
      receiverAddrs: [data.toAddr],
      txRaw: JSON.stringify(
        { ...data.tx, block: walletResponse.blockHash },
        (_: string, value: any) => typeof value === 'bigint' ? `bigint:${value.toString()}` : value,
      ),
      amount: '123000',
      isFallback: false,
      nativeTokenAmount: data.amount,
      isLayerZero: false,
  }));

  const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
  if (response instanceof ErrorResponse) {
      throw new Error(response.err)
  }
  
  return response;
}


export const getSolanaTransaction = async function (
    settings: ISettingsState, srcChain: ChainEnum, dstChain: ChainEnum,
    fromAddr: string, toAddr: string, amount: string,
): Promise<SolanaData>{
    const validationErr = validateSubmitTxInputs(srcChain, dstChain, toAddr, amount, false, settings);
    if (!!validationErr) {
        throw new Error(validationErr);
    }

    const connection = new Connection(
        "http://api.devnet.solana.com",
        "confirmed"
    );

    const provider = new AnchorProvider(connection, readonlyWallet(new PublicKey(fromAddr)), { commitment: "confirmed" });
    setProvider(provider);

    const program = new Program(
        skylineProgram
    ) as Program<SkylineProgram>;

    const sender = new PublicKey(fromAddr);
    const receiver = Array.from(
        Buffer.from(
          toAddr
        )
    );

    const mint = new PublicKey("DfgZKtDcKFWNUTC7rifS4c8GdMKqV76adiyusTnEqz7m");
    const senderAta = await getAssociatedTokenAddress(mint, sender);
    
    const tx = await program.methods
    .bridgeRequest(new BN(parseInt(amount)), receiver, 2)
    .accounts({
        signer: sender,
        signersAta: senderAta,
        mint: mint
    }).transaction();


    return {srcChain: srcChain, dstChain: dstChain, fromAddr: fromAddr, toAddr: toAddr, amount: amount, tx: tx};
}

export type SolanaData = {
    srcChain: ChainEnum,
    dstChain: ChainEnum,
    fromAddr: string,
    toAddr: string,
    amount: string,
    tx: Transaction,
}



