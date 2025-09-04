// sendOFTWithWalletHandler.web3.nobigint.ts
import Web3 from "web3";
import BN from "bn.js";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import evmWalletHandler from "./EvmWalletHandler";
import { SendParams } from "./types";
import { isAddress } from "web3-validator";
import { bridgingTransactionSubmittedAction } from "../pages/Transactions/action";
import { BridgeTransactionDto, ChainEnum, TransactionSubmittedDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction, ErrorResponse } from "../utils/fetchUtils";

const OFT_ABI = [
  {
    type: "function",
    name: "send",
    stateMutability: "payable",
    inputs: [
      {
        name: "sendParam",
        type: "tuple",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "to", type: "bytes32" },
          { name: "amountLD", type: "uint256" },
          { name: "minAmountLD", type: "uint256" },
          { name: "extraOptions", type: "bytes" },
          { name: "composeMsg", type: "bytes" },
          { name: "oftCmd", type: "bytes" },
        ],
      },
      {
        name: "fee",
        type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" },
        ],
      },
      { name: "refundAddress", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "quoteSend",
    stateMutability: "view",
    inputs: [
      {
        name: "sendParam",
        type: "tuple",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "to", type: "bytes32" },
          { name: "amountLD", type: "uint256" },
          { name: "minAmountLD", type: "uint256" },
          { name: "extraOptions", type: "bytes" },
          { name: "composeMsg", type: "bytes" },
          { name: "oftCmd", type: "bytes" },
        ],
      },
      { name: "payInLzToken", type: "bool" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
];

export const buildExtraOptions = () =>
  Options.newOptions().addExecutorLzReceiveOption(10000, 0).toHex(); //  TODO maybe this in settings.

/** parseUnits without BigInt/ethers: string math using bn.js */
function parseUnitsBN(value: string | number, decimals: number): string {
  const s = String(value);
  const scale = new BN("1" + "0".repeat(Math.max(0, decimals)));
  if (!s.includes(".")) {
    return new BN(s).mul(scale).toString(10);
  }
  const [whole, fracRaw] = s.split(".");
  const frac = (fracRaw || "").slice(0, decimals);
  const fracPadded = frac.padEnd(decimals, "0");
  const a = new BN(whole || "0").mul(scale);
  const b = new BN(fracPadded || "0");
  return a.add(b).toString(10);
}

export async function createAndSendLayerZeroTransaction(
  sendParam: SendParams,
  oftAddress: string,
  originChain: ChainEnum,
  destinationChain: ChainEnum
): Promise<BridgeTransactionDto> {
  // 1) Enable wallet
  await evmWalletHandler.enable(async () => {});

  // 2) From address
  const from = await evmWalletHandler.getAddress();
  if (!from) throw new Error("No account connected");

  // 3) Init web3 + contract
  const web3 = new Web3((window as any).ethereum);
  if (!isAddress(oftAddress)) {
    throw new Error(`Invalid OFT address: ${oftAddress}`);
  }
  const oft = new web3.eth.Contract(OFT_ABI as any, oftAddress);

  // 4) Decimals (fallback = 18)
  const decStr = await oft.methods.decimals().call().catch(() => "18");
  const parsed = Number(decStr);
  const amountLD = parseUnitsBN(sendParam.amountLD, parsed);

  sendParam.amountLD = amountLD

  // 5) Quote fees
  let nativeFee = "0";
  try {
    const feeRes: any = await oft.methods.quoteSend(sendParam, false).call();
    nativeFee = feeRes?.nativeFee ?? feeRes?.[0] ?? "0";
    if (!nativeFee) nativeFee = "0";
  } catch (err) {
    nativeFee = parseUnitsBN("0.01", 18);
    console.warn("quoteSend failed; using fallback fee 0.01 ETH:", err);
  }

  // 6) Encode send(...)
  let data : string = oft.methods
      .send(sendParam, { nativeFee, lzTokenFee: "0" }, from)
      .encodeABI();


  const txBase: any = { from, to: oftAddress, data, value: nativeFee };

  // 7) Estimate gas (+20%)
  let gas: string | undefined;
  try {
    const est = await evmWalletHandler.estimateGas(txBase);
    const gasWithBuffer = new BN(String(est)).mul(new BN(120)).div(new BN(100));
    gas = gasWithBuffer.toString(10);
  } catch (err) {
    console.warn("Gas estimation failed; sending without explicit gas:", err);
  }

  // 8) Gas price
  let gasPrice: bigint | undefined;
  try {
    gasPrice = await evmWalletHandler.getGasPrice();
  } catch (err) {
    console.warn("Failed to get gas price; letting wallet/provider pick:", err);
  }

  const tx = {
    ...txBase,
    ...(gas ? { gas } : {}),
    ...(gasPrice ? { gasPrice } : {}),
  };

  // 9) Submit
  const receipt = await evmWalletHandler.submitTx(tx);
  
  const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
    originChain: originChain,
    destinationChain: destinationChain,
    originTxHash: receipt.transactionHash.toString(),
    senderAddress: from!,
    receiverAddrs: [sendParam.to!],
    txRaw: JSON.stringify(
    { ...tx, block: receipt.blockNumber.toString() },
    (_: string, value: any) => typeof value === 'bigint' ? `bigint:${value.toString()}` : value,
    ),
    isFallback: false,
    isLayerZero: true,
    // TODO: check for this 
    amount: amountLD,
    nativeTokenAmount: '0',
    }));
  
    const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
    if (response instanceof ErrorResponse) {
      throw new Error(response.err)
    }
  
    return response;
}