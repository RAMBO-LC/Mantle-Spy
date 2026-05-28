import { ethers } from "ethers";
import { safeRequest } from "./utils/request.js";

// Minimal ABI — only what we need
const ABI = [
  "function logSignal(bytes32 dataHash, uint8 signalType, uint8 confidence, string calldata txReference) external returns (uint256)",
  "function getSignalCount() external view returns (uint256)",
  "function getLatestSignals(uint256 count) external view returns (tuple(bytes32 dataHash, uint8 signalType, uint8 confidence, uint256 timestamp, address triggeredBy, string txReference)[])",
  "event SignalLogged(uint256 indexed id, uint8 indexed signalType, uint8 confidence, bytes32 dataHash, string txReference, uint256 timestamp)",
];

const SIGNAL_TYPE_MAP = { IGNORE: 0, WATCH: 1, BUY: 2, SELL: 3 };

let contract = null;

export function initOnChainLogger() {
  const rpcUrl = process.env.MANTLE_RPC_URL || "https://rpc.sepolia.mantle.xyz";
  const privateKey = process.env.PRIVATE_KEY || process.env.MANTLE_PRIVATE_KEY;
  const contractAddress = process.env.SIGNAL_LOGGER_ADDRESS;

  if (!privateKey || !contractAddress) {
    console.warn("[OnChain] PRIVATE_KEY/MANTLE_PRIVATE_KEY or SIGNAL_LOGGER_ADDRESS not set — on-chain logging disabled");
    return false;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  contract = new ethers.Contract(contractAddress, ABI, wallet);

  console.log(`[OnChain] Logger ready at ${contractAddress}`);
  return true;
}

export async function logSignalOnChain(signal) {
  if (!contract) return null;

  try {
    const dataHashBytes = ethers.getBytes(signal.dataHash);
    const signalTypeEnum = SIGNAL_TYPE_MAP[signal.signal] ?? 0;

    const tx = await safeRequest(async () => {
      return await contract.logSignal(
        dataHashBytes,
        signalTypeEnum,
        signal.confidence,
        signal.txHash || "0x"
      );
    }, "Mantle RPC");

    if (!tx) return null;

    const receipt = await safeRequest(() => tx.wait(), "Mantle RPC");
    if (!receipt) return null;
    const onChainTxHash = receipt.hash;

    console.log(
      `[OnChain] Signal logged: ${onChainTxHash.slice(0, 12)}... (block ${receipt.blockNumber})`
    );

    return {
      onChainTxHash,
      blockNumber: receipt.blockNumber,
      explorerUrl: `https://mantlescan.xyz/tx/${onChainTxHash}`,
    };
  } catch (err) {
    console.error("[OnChain] Log failed:", err.message);
    return null;
  }
}

export async function getSignalCount() {
  if (!contract) return 0;
  const count = await safeRequest(() => contract.getSignalCount(), "Mantle RPC");
  return count ? Number(count) : 0;
}

export async function getLatestOnChainSignals(count = 10) {
  if (!contract) return [];
  const signals = await safeRequest(() => contract.getLatestSignals(count), "Mantle RPC");
  if (!signals) return [];
  return signals.map((s) => ({
    dataHash: s.dataHash,
    signalType: ["IGNORE", "WATCH", "BUY", "SELL"][s.signalType] || "UNKNOWN",
    confidence: s.confidence,
    timestamp: new Date(Number(s.timestamp) * 1000).toISOString(),
    triggeredBy: s.triggeredBy,
    txReference: s.txReference,
  }));
}