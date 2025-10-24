import Web3, { Transaction } from "web3";
import evmWalletHandler from "../features/EvmWalletHandler";
import { ISettingsState } from "../settings/settingsRedux";
import { ChainEnum, TransactionSubmittedDto } from "../swagger/apexBridgeApiService";
import { validateSubmitTxInputs } from "../utils/validationUtils";
import { bridgingTransactionSubmittedAction } from "../pages/Transactions/action";
import { UpdateSubmitLoadingState } from "../utils/statusUtils";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";

 export  const sendEthSolanaTransaction = async ( settings: ISettingsState, srcChain: ChainEnum, dstChain: ChainEnum,
    fromAddr: string, toAddr: string, amount: string,
    updateLoadingState: (newState: UpdateSubmitLoadingState) => void,) =>  {
    const validationErr = validateSubmitTxInputs(srcChain, dstChain, fromAddr, amount, false, settings);
    if (validationErr) {
      throw new Error(validationErr);
    }

    //const weiAmount = convertDfmToWei(amount)

    const tx = await createNexusSolanaTx(amount)

    const onTxHash = (txHash: any) => {
    updateLoadingState({ content: 'Waiting for transaction receipt...', txHash: txHash.toString() })
  }

      const submitPromise = evmWalletHandler.submitTx(tx);
  submitPromise.on('transactionHash', onTxHash)

  const receipt = await submitPromise;
  submitPromise.off('transactionHash', onTxHash);
    
      const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
          originChain: srcChain,
          destinationChain: dstChain,
          originTxHash: receipt.transactionHash.toString(),
          senderAddress: fromAddr,
          receiverAddrs: [toAddr],
          txRaw: JSON.stringify(
            { ...tx, block: receipt.transactionHash.toString() },
            (_: string, value: any) => typeof value === 'bigint' ? `bigint:${value.toString()}` : value,
          ),
          amount:amount,
          isFallback: false,
          nativeTokenAmount: '0',
          isLayerZero: false,
      }));

        const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
        if (response instanceof ErrorResponse) {
            throw new Error(response.err)
        }
        
        return response;

  }


export async function createNexusSolanaTx(
  amountWei: string | bigint,
  gasLimitOverride?: number
): Promise<Transaction> {

    const receivingAddress = '0xe2F2a0a2f302Ebd64F1106Cf2BE5788A98da8546'   

  // 1) Basic checks & context
  if (!evmWalletHandler.checkWallet()) throw new Error("Wallet not enabled");
  const web3 = evmWalletHandler.getWeb3();
  if (!web3) throw new Error("Web3 provider missing");
  if (!web3.utils.isAddress(receivingAddress)) throw new Error("Invalid recipient address");

  const from = await evmWalletHandler.getAddress();
  if (!from) throw new Error("No connected wallet address");

  // 2) Build the base transaction
  const baseTx: Transaction = {
    from,
    to: web3.utils.toChecksumAddress(receivingAddress),
    value: amountWei.toString(),
  } as unknown as Transaction;

  // 3) Gas limit
  const gas =
    gasLimitOverride ??
    (await evmWalletHandler.estimateGas(baseTx as any));

  // 4) Prefer EIP-1559 if supported; otherwise use legacy gasPrice
  const latest = await web3.eth.getBlock("pending");
  const supports1559 = (latest as any)?.baseFeePerGas != null;

  let txToSend: Transaction;

  if (supports1559) {
    const baseFee = BigInt((latest as any).baseFeePerGas); // wei
    const tip = BigInt(Web3.utils.toWei("1.5", "gwei"));   // simple default priority tip
    const maxFeePerGas = baseFee * BigInt(2) + tip;               // conservative ceiling

    txToSend = {
      ...baseTx,
      gas,
      // @ts-ignore: fields allowed by provider even if not in older typings
      maxPriorityFeePerGas: tip.toString(),
      // @ts-ignore
      maxFeePerGas: maxFeePerGas.toString(),
    } as unknown as Transaction;
  } else {
    const gasPrice = await evmWalletHandler.getGasPrice(); // string (wei)
    txToSend = {
      ...baseTx,
      gas,
      // legacy
      // @ts-ignore
      gasPrice,
    } as unknown as Transaction;
  }

  return txToSend
}