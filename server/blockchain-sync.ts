import { ethers } from "ethers";
import { storage } from "./storage";
import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

interface BlockchainSyncConfig {
  rpcUrl: string;
  wssUrl: string;
  chainId: string;
  nativeToken: string;
}

export class BlockchainSync {
  private formatError(error: any): string {
    if (!error) return String(error);
    try {
      if (typeof error === "string") return error;
      if (error instanceof Error) return error.stack || error.message;
      if (typeof (error as any).message === "string") return (error as any).message;
      return JSON.stringify(error);
    } catch (e) {
      return String(error);
    }
  }

  private provider: ethers.JsonRpcProvider;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private config: BlockchainSyncConfig;
  private isRunning = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private blockProcessingQueue: Set<number> = new Set();

  constructor(config: BlockchainSyncConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  async start() {
    if (this.isRunning) {
      console.log("Blockchain sync already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting blockchain sync service...");

    try {
      const syncState = await storage.getSyncState();
      const lastSyncedBlock = syncState?.lastSyncedBlock || 0;

      const currentBlock = await this.provider.getBlockNumber();
      console.log(`Current blockchain height: ${currentBlock}`);
      console.log(`Last synced block: ${lastSyncedBlock}`);

      if (lastSyncedBlock < currentBlock) {
        const blocksToSync = Math.min(currentBlock - lastSyncedBlock, 10);
        console.log(`Syncing ${blocksToSync} recent blocks...`);
        
        for (let i = currentBlock - blocksToSync + 1; i <= currentBlock; i++) {
          await this.processBlock(i);
        }
      }

      await this.connectWebSocket();
    } catch (error) {
      console.error("Error starting blockchain sync:", this.formatError(error));
      // Best-effort: don't let storage errors bubble to caller
      storage.updateSyncState(0, false).catch((e) => {
        console.error("Failed to update sync state after start error:", this.formatError(e));
      });
      this.scheduleReconnect();
    }
  }

  private async connectWebSocket() {
    try {
      console.log("Connecting to blockchain WebSocket...");
      this.wsProvider = new ethers.WebSocketProvider(this.config.wssUrl);

      this.wsProvider.on("block", async (blockNumber: number) => {
        console.log(`New block detected: ${blockNumber}`);
        await this.processBlock(blockNumber);
      });

      this.wsProvider.on("error", (error) => {
        console.error("WebSocket error:", this.formatError(error));
        this.handleDisconnect();
      });

      // The underlying websocket instance may not be exposed the same way across
      // ethers versions. Guard access to avoid TypeScript/runtime errors.
      // Try common fields that hold the raw WebSocket object.
      const rawWs: any = (this.wsProvider as any).ws || (this.wsProvider as any).websocket || (this.wsProvider as any)._websocket;
      if (rawWs && typeof rawWs.on === "function") {
        rawWs.on("close", () => {
          console.log("WebSocket connection closed");
          this.handleDisconnect();
        });
      } else if ((this.wsProvider as any).on) {
        // fallback: listen for 'close' on provider if supported
        try {
          (this.wsProvider as any).on("close", () => {
            console.log("WebSocket connection closed");
            this.handleDisconnect();
          });
        } catch (e) {
          // ignore
        }
      }

      await storage.updateSyncState(await this.provider.getBlockNumber(), true);
      console.log("WebSocket connected successfully");
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    if (this.wsProvider) {
      try {
        this.wsProvider.destroy();
      } catch (e) {
      }
      this.wsProvider = null;
    }

    storage.updateSyncState(0, false).catch(console.error);
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    console.log("Scheduling WebSocket reconnect in 10 seconds...");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isRunning) {
        this.connectWebSocket();
      }
    }, 10000);
  }

  private async processBlock(blockNumber: number) {
    if (this.blockProcessingQueue.has(blockNumber)) {
      return;
    }

    this.blockProcessingQueue.add(blockNumber);

    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) {
        console.warn(`Block ${blockNumber} not found`);
        return;
      }

      const existingBlock = await storage.getBlock(blockNumber);
      if (existingBlock) {
        return;
      }

      const baseFeePerGas = block.baseFeePerGas?.toString() || "0";
      const burntFees = block.baseFeePerGas
        ? (BigInt(block.gasUsed) * block.baseFeePerGas).toString()
        : "0";

      await storage.insertBlock({
        blockNumber: block.number,
        hash: block.hash || "",
        miner: block.miner || "",
        timestamp: block.timestamp,
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        size: block.length || 0,
        baseFeePerGas,
        burntFees,
        transactionCount: block.transactions.length,
      });

      for (const txHash of block.transactions) {
        await this.processTransaction(txHash, block.number, block.timestamp);
      }

      await storage.updateSyncState(blockNumber, true);
      console.log(`Processed block ${blockNumber} with ${block.transactions.length} transactions`);
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    } finally {
      this.blockProcessingQueue.delete(blockNumber);
    }
  }

  private async processTransaction(txHash: string, blockNumber: number, blockTimestamp: number) {
    try {
      const existingTx = await storage.getTransaction(txHash);
      if (existingTx) {
        return;
      }

      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);

      if (!tx || !receipt) {
        return;
      }

      const method = tx.data.length > 10 ? tx.data.slice(0, 10) : null;
      const contractCreated = receipt.contractAddress || null;

      await storage.insertTransaction({
        txHash: tx.hash,
        blockNumber,
        fromAddress: tx.from,
        toAddress: tx.to || null,
        value: tx.value.toString(),
        gasPrice: tx.gasPrice?.toString() || "0",
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status || 0,
        nonce: tx.nonce,
        transactionIndex: tx.index,
        input: tx.data,
        timestamp: blockTimestamp,
        method,
        contractCreated,
        logs: receipt.logs as any,
      });

      await this.updateAddress(tx.from, blockTimestamp);

      if (tx.to) {
        await this.updateAddress(tx.to, blockTimestamp);
      }

      if (contractCreated) {
        await this.updateAddress(contractCreated, blockTimestamp);
        
        await storage.upsertAddress({
          address: contractCreated,
          balance: "0",
          type: "Contract",
          isContract: true,
          firstSeen: blockTimestamp,
          lastSeen: blockTimestamp,
          transactionCount: 0,
        });

        await storage.insertContract({
          address: contractCreated,
          creator: tx.from,
          creationTxHash: txHash,
          sourceCode: null,
          compilerVersion: null,
          optimization: null,
          optimizationRuns: null,
          constructorArgs: null,
          abi: null,
          verified: false,
          verifiedAt: null,
          contractName: null,
        });
      }

      for (const log of receipt.logs) {
        if (log.topics.length > 0 && log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
          const tokenAddress = log.address;
          
          const token = await storage.getToken(tokenAddress);
          if (!token) {
            await this.indexToken(tokenAddress);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing transaction ${txHash}:`, error);
    }
  }

  private async updateAddress(address: string, timestamp: number) {
    try {
      const existing = await storage.getAddress(address);
      const balance = await this.provider.getBalance(address);
      
      if (!existing) {
        const code = await this.provider.getCode(address);
        const isContract = code !== "0x";

        await storage.upsertAddress({
          address,
          balance: balance.toString(),
          type: isContract ? "Contract" : "EOA",
          isContract,
          firstSeen: timestamp,
          lastSeen: timestamp,
          transactionCount: 1,
        });
      } else {
        await storage.upsertAddress({
          address,
          balance: balance.toString(),
          type: existing.type,
          isContract: existing.isContract,
          firstSeen: existing.firstSeen,
          lastSeen: timestamp,
          transactionCount: existing.transactionCount + 1,
        });
      }
    } catch (error) {
      console.error(`Error updating address ${address}:`, error);
    }
  }

  private async indexToken(tokenAddress: string) {
    try {
      const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
      ];

      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name().catch(() => "Unknown"),
        contract.symbol().catch(() => "???"),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => BigInt(0)),
      ]);

      await storage.upsertToken({
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        logoUrl: null,
        logoStatus: "no_logo",
        submittedBy: null,
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: null,
      });

      console.log(`Indexed token: ${symbol} (${name}) at ${tokenAddress}`);
    } catch (error) {
      console.error(`Error indexing token ${tokenAddress}:`, error);
    }
  }

  stop() {
    console.log("Stopping blockchain sync service...");
    this.isRunning = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.wsProvider) {
      this.wsProvider.destroy();
      this.wsProvider = null;
    }

    storage.updateSyncState(0, false).catch(console.error);
  }
}

let blockchainSync: BlockchainSync | null = null;

export function initBlockchainSync() {
  if (!process.env.RPC_URL || !process.env.WSS_URL) {
    console.warn("RPC_URL or WSS_URL not configured. Blockchain sync disabled.");
    return;
  }

  const config: BlockchainSyncConfig = {
    rpcUrl: process.env.RPC_URL,
    wssUrl: process.env.WSS_URL,
    chainId: process.env.CHAIN_ID || "1",
    nativeToken: process.env.NATIVE_TOKEN || "MTX",
  };

  blockchainSync = new BlockchainSync(config);
  blockchainSync.start().catch((error) => {
    console.error("Failed to start blockchain sync:", error);
  });

  return blockchainSync;
}

export function getBlockchainSync() {
  return blockchainSync;
}
