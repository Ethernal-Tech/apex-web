// sendOFTWithWalletHandler.web3.nobigint.ts
import Web3 from "web3";
import BN from "bn.js";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import evmWalletHandler from "./EvmWalletHandler";

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

// Helpers
const toBytes32Address = (addr: string) =>
  "0x" + addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");

const buildExtraOptions = () =>
  Options.newOptions().addExecutorLzReceiveOption(10000, 0).toHex();

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

type SendArgs = {
  oftAddress: string;
  toAddress: string;
  tokensToSend: string | number;
  dstEid: number;
};

async function createAndSendLayerZeroTransaction({
  oftAddress,
  toAddress,
  tokensToSend,
  dstEid,
}: SendArgs) {
  await evmWalletHandler.enable(async () => {});
  const from = await evmWalletHandler.getAddress();
  if (!from) throw new Error("No account connected");

  const web3 = new Web3((window as any).ethereum);
  const oft = new web3.eth.Contract(OFT_ABI as any, oftAddress);

  const decStr = await oft.methods.decimals().call().catch(() => "18");
  const decimals = Number(decStr || 18);
  const amountLD = parseUnitsBN(tokensToSend, decimals);

  const sendParam = {
    dstEid,
    to: toBytes32Address(toAddress),
    amountLD,
    minAmountLD: "0",
    extraOptions: buildExtraOptions(),
    composeMsg: "0x",
    oftCmd: "0x",
  };

  // Quote fees (string outputs)
  let nativeFee = "0";
  try {
    const feeRes: any = await oft.methods.quoteSend(sendParam, false).call();
    nativeFee = feeRes?.nativeFee ?? feeRes?.[0] ?? "0";
  } catch {
    nativeFee = parseUnitsBN("0.01", 18); // fallback 0.01 ETH
  }

  // Encode send(...)
  const data = oft.methods
    .send(sendParam, { nativeFee, lzTokenFee: "0" }, from)
    .encodeABI();

  const txBase: any = { from, to: oftAddress, data, value: nativeFee };

  // Estimate gas and add +20% using bn.js
  let gas: string | undefined;
  try {
    const est = await evmWalletHandler.estimateGas(txBase);
    const gasWithBuffer = new BN(String(est)).mul(new BN(120)).div(new BN(100));
    gas = gasWithBuffer.toString(10);
  } catch {
    gas = undefined;
  }

  const gasPrice = await evmWalletHandler.getGasPrice();

  const tx = {
    ...txBase,
    ...(gas ? { gas } : {}),
    ...(gasPrice ? { gasPrice } : {}),
  };

  const receipt = await evmWalletHandler.submitTx(tx);
  console.log("Transaction sent. Receipt:", receipt);
  return receipt;
}

export async function sendLayerZeroTransaction() {
  return createAndSendLayerZeroTransaction({
    oftAddress: "0xB7197052a7b553d19107Ef4CbbF410b02d487341",
    toAddress: "0x9F83960dc0e773750165244c9e5aC51A5732237E",
    tokensToSend: "2",
    dstEid: 40161,
  });
}
