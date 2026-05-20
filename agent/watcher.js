import { ethers } from "ethers";
import { EventEmitter } from "events";

export class MantleWatcher extends EventEmitter {
  constructor(config = {}) {
    super();
    this.rpcUrl = config.rpcUrl || process.env.MANTLE_RPC_URL || "https://rpc.mantle.xyz";
    this.thresholdMNT = config.thresholdMNT || parseFloat(process.env.SIGNAL_THRESHOLD_MNT || process.env.WATCHER_THRESHOLD_MNT || "10");
    this.trackedWallets = new Set(
      (config.trackedWallets || process.env.TRACKED_WALLETS || "")
        .split(",")
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)
    );
    this.provider = null;
    this.isRunning = false;
    this.blocksScanned = 0;
    this.lastBlockTime = null;
    this.latencyMs = 0;
    this.lastBlockNumber = 0;
  }

  async connect() {
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    const network = await this.provider.getNetwork();
    console.log(`[Watcher] Connected to Mantle (chainId: ${network.chainId})`);
    return network;
  }

  addTrackedWallet(address) {
    this.trackedWallets.add(address.toLowerCase());
    this.emit("walletAdded", address);
  }

  removeTrackedWallet(address) {
    this.trackedWallets.delete(address.toLowerCase());
  }

  getTrackedWallets() {
    return [...this.trackedWallets];
  }

  async start() {
    if (!this.provider) await this.connect();
    this.isRunning = true;
    console.log(`[Watcher] Starting block monitoring (threshold: ${this.thresholdMNT} MNT)`);

    this.provider.on("block", async (blockNumber) => {
      const t0 = Date.now();
      try {
        const block = await this.provider.getBlock(blockNumber, true);
        if (!block || !block.transactions) return;

        this.blocksScanned++;
        this.lastBlockNumber = blockNumber;
        this.lastBlockTime = new Date();
        this.latencyMs = Date.now() - t0;

        this.emit("block", { blockNumber, txCount: block.transactions.length });

        for (const tx of block.transactions) {
          await this._processTx(tx, blockNumber);
        }
      } catch (err) {
        console.error(`[Watcher] Block ${blockNumber} error:`, err.message);
      }
    });
  }

  async stop() {
    this.isRunning = false;
    if (this.provider) {
      this.provider.removeAllListeners("block");
    }
    console.log("[Watcher] Stopped.");
  }

  async _processTx(tx, blockNumber) {
    if (!tx || !tx.value) return;

    const valueMNT = parseFloat(ethers.formatEther(tx.value));
    const fromLower = (tx.from || "").toLowerCase();
    const toLower = (tx.to || "").toLowerCase();

    const isLargeTx = valueMNT >= this.thresholdMNT;
    const isTrackedFrom = this.trackedWallets.has(fromLower);
    const isTrackedTo = this.trackedWallets.has(toLower);

    if (!isLargeTx && !isTrackedFrom && !isTrackedTo) return;

    // Enrich with receipt for contract interactions
    let receipt = null;
    try {
      receipt = await this.provider.getTransactionReceipt(tx.hash);
    } catch (_) {}

    const flagged = {
      blockNumber,
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      valueMNT: valueMNT.toFixed(4),
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") : "0",
      isContract: receipt ? receipt.contractAddress !== null : false,
      logsCount: receipt ? receipt.logs.length : 0,
      reason: isTrackedFrom
        ? "tracked_wallet_outflow"
        : isTrackedTo
        ? "tracked_wallet_inflow"
        : "large_transfer",
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[Watcher] Flagged tx ${tx.hash.slice(0, 10)}... | ${valueMNT.toFixed(2)} MNT | ${flagged.reason}`
    );

    this.emit("flaggedTx", flagged);
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      blocksScanned: this.blocksScanned,
      lastBlockNumber: this.lastBlockNumber,
      lastBlockTime: this.lastBlockTime,
      latencyMs: this.latencyMs,
      trackedWallets: this.trackedWallets.size,
      thresholdMNT: this.thresholdMNT,
      rpcUrl: this.rpcUrl,
    };
  }
}