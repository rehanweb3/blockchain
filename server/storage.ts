import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  Block, InsertBlock,
  Transaction, InsertTransaction,
  Address, InsertAddress,
  Contract, InsertContract,
  Token, InsertToken,
  TokenTransfer, InsertTokenTransfer,
  AdminUser, InsertAdminUser,
  SyncState
} from "@shared/schema";

export interface IStorage {
  getLatestBlock(): Promise<number>;
  getSyncState(): Promise<SyncState | undefined>;
  updateSyncState(blockNumber: number, isConnected: boolean): Promise<void>;
  
  insertBlock(block: InsertBlock & { blockNumber: number }): Promise<Block>;
  getBlock(blockNumber: number): Promise<Block | undefined>;
  getBlockByHash(hash: string): Promise<Block | undefined>;
  getLatestBlocks(limit: number): Promise<Block[]>;
  
  insertTransaction(tx: InsertTransaction & { txHash: string }): Promise<Transaction>;
  getTransaction(txHash: string): Promise<Transaction | undefined>;
  getLatestTransactions(limit: number): Promise<Transaction[]>;
  getTransactionsByBlock(blockNumber: number): Promise<Transaction[]>;
  getTransactionsByAddress(address: string, limit: number): Promise<Transaction[]>;
  
  upsertAddress(address: InsertAddress & { address: string }): Promise<Address>;
  getAddress(address: string): Promise<Address | undefined>;
  updateAddressBalance(address: string, balance: string): Promise<void>;
  getTotalAddresses(): Promise<number>;
  
  insertContract(contract: InsertContract & { address: string }): Promise<Contract>;
  updateContract(address: string, updates: Partial<Contract>): Promise<void>;
  getContract(address: string): Promise<Contract | undefined>;
  getVerifiedContracts(): Promise<Contract[]>;
  getTotalVerifiedContracts(): Promise<number>;
  
  upsertToken(token: InsertToken & { address: string }): Promise<Token>;
  getToken(address: string): Promise<Token | undefined>;
  getTokens(): Promise<Token[]>;
  getTokensByLogoStatus(status: string): Promise<Token[]>;
  updateTokenLogoStatus(address: string, status: string, reviewedBy: string): Promise<void>;
  updateTokenMetadata(address: string, updates: Partial<Token>): Promise<void>;
  
  insertTokenTransfer(transfer: InsertTokenTransfer): Promise<TokenTransfer>;
  
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  
  getStats(): Promise<{
    latestBlock: number;
    totalTransactions: number;
    totalAddresses: number;
    totalContracts: number;
    isConnected: boolean;
  }>;
  
  getAdminStats(): Promise<{
    pendingLogos: number;
    approvedLogos: number;
    rejectedLogos: number;
    totalBlocks: number;
    totalTransactions: number;
  }>;
  
  getDailyTransactionStats(days: number): Promise<Array<{
    date: string;
    count: number;
    totalValue: string;
  }>>;
}

export class DatabaseStorage implements IStorage {
  async getLatestBlock(): Promise<number> {
    const result = await db
      .select({ blockNumber: schema.blocks.blockNumber })
      .from(schema.blocks)
      .orderBy(desc(schema.blocks.blockNumber))
      .limit(1);
    
    return result[0]?.blockNumber || 0;
  }

  async getSyncState(): Promise<SyncState | undefined> {
    const [state] = await db.select().from(schema.syncState).limit(1);
    return state;
  }

  async updateSyncState(blockNumber: number, isConnected: boolean): Promise<void> {
    await db
      .insert(schema.syncState)
      .values({
        id: 1,
        lastSyncedBlock: blockNumber,
        lastSyncedAt: new Date(),
        isConnected,
      })
      .onConflictDoUpdate({
        target: schema.syncState.id,
        set: {
          lastSyncedBlock: blockNumber,
          lastSyncedAt: new Date(),
          isConnected,
        },
      });
  }

  async insertBlock(block: InsertBlock & { blockNumber: number }): Promise<Block> {
    const [inserted] = await db
      .insert(schema.blocks)
      .values(block)
      .onConflictDoNothing()
      .returning();
    return inserted;
  }

  async getBlock(blockNumber: number): Promise<Block | undefined> {
    const [block] = await db
      .select()
      .from(schema.blocks)
      .where(eq(schema.blocks.blockNumber, blockNumber));
    return block;
  }

  async getBlockByHash(hash: string): Promise<Block | undefined> {
    const [block] = await db
      .select()
      .from(schema.blocks)
      .where(eq(schema.blocks.hash, hash));
    return block;
  }

  async getLatestBlocks(limit: number): Promise<Block[]> {
    return db
      .select()
      .from(schema.blocks)
      .orderBy(desc(schema.blocks.blockNumber))
      .limit(limit);
  }

  async insertTransaction(tx: InsertTransaction & { txHash: string }): Promise<Transaction> {
    const [inserted] = await db
      .insert(schema.transactions)
      .values(tx)
      .onConflictDoNothing()
      .returning();
    return inserted;
  }

  async getTransaction(txHash: string): Promise<Transaction | undefined> {
    const [tx] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.txHash, txHash));
    return tx;
  }

  async getLatestTransactions(limit: number): Promise<Transaction[]> {
    return db
      .select()
      .from(schema.transactions)
      .orderBy(desc(schema.transactions.timestamp))
      .limit(limit);
  }

  async getTransactionsByBlock(blockNumber: number): Promise<Transaction[]> {
    return db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.blockNumber, blockNumber))
      .orderBy(schema.transactions.transactionIndex);
  }

  async getTransactionsByAddress(address: string, limit: number): Promise<Transaction[]> {
    return db
      .select()
      .from(schema.transactions)
      .where(
        or(
          eq(schema.transactions.fromAddress, address),
          eq(schema.transactions.toAddress, address)
        )
      )
      .orderBy(desc(schema.transactions.timestamp))
      .limit(limit);
  }

  async upsertAddress(address: InsertAddress & { address: string }): Promise<Address> {
    const [upserted] = await db
      .insert(schema.addresses)
      .values(address)
      .onConflictDoUpdate({
        target: schema.addresses.address,
        set: {
          balance: address.balance,
          lastSeen: address.lastSeen,
          transactionCount: sql`${schema.addresses.transactionCount} + 1`,
        },
      })
      .returning();
    return upserted;
  }

  async getAddress(address: string): Promise<Address | undefined> {
    const [addr] = await db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.address, address));
    return addr;
  }

  async updateAddressBalance(address: string, balance: string): Promise<void> {
    await db
      .update(schema.addresses)
      .set({ balance })
      .where(eq(schema.addresses.address, address));
  }

  async getTotalAddresses(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.addresses);
    return result?.count || 0;
  }

  async insertContract(contract: InsertContract & { address: string }): Promise<Contract> {
    const [inserted] = await db
      .insert(schema.contracts)
      .values(contract)
      .onConflictDoNothing()
      .returning();
    return inserted;
  }

  async updateContract(address: string, updates: Partial<Contract>): Promise<void> {
    await db
      .update(schema.contracts)
      .set(updates)
      .where(eq(schema.contracts.address, address));
  }

  async getContract(address: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.address, address));
    return contract;
  }

  async getVerifiedContracts(): Promise<Contract[]> {
    return db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.verified, true))
      .orderBy(desc(schema.contracts.verifiedAt));
  }

  async getTotalVerifiedContracts(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.contracts)
      .where(eq(schema.contracts.verified, true));
    return result?.count || 0;
  }

  async upsertToken(token: InsertToken & { address: string }): Promise<Token> {
    const [upserted] = await db
      .insert(schema.tokens)
      .values(token)
      .onConflictDoUpdate({
        target: schema.tokens.address,
        set: {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          totalSupply: token.totalSupply,
          logoUrl: token.logoUrl,
          logoStatus: token.logoStatus,
          submittedBy: token.submittedBy,
          submittedAt: token.submittedAt,
          reviewedAt: token.reviewedAt,
          reviewedBy: token.reviewedBy,
        },
      })
      .returning();
    return upserted;
  }

  async getToken(address: string): Promise<Token | undefined> {
    const [token] = await db
      .select()
      .from(schema.tokens)
      .where(eq(schema.tokens.address, address));
    return token;
  }

  async getTokens(): Promise<Token[]> {
    return db
      .select()
      .from(schema.tokens)
      .orderBy(schema.tokens.symbol);
  }

  async getTokensByLogoStatus(status: string): Promise<Token[]> {
    return db
      .select()
      .from(schema.tokens)
      .where(eq(schema.tokens.logoStatus, status))
      .orderBy(desc(schema.tokens.submittedAt));
  }

  async updateTokenLogoStatus(address: string, status: string, reviewedBy: string): Promise<void> {
    await db
      .update(schema.tokens)
      .set({
        logoStatus: status,
        reviewedAt: new Date(),
        reviewedBy,
      })
      .where(eq(schema.tokens.address, address));
  }

  async updateTokenMetadata(address: string, updates: Partial<Token>): Promise<void> {
    await db
      .update(schema.tokens)
      .set(updates)
      .where(eq(schema.tokens.address, address));
  }

  async insertTokenTransfer(transfer: InsertTokenTransfer): Promise<TokenTransfer> {
    const [inserted] = await db
      .insert(schema.tokenTransfers)
      .values(transfer)
      .returning();
    return inserted;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db
      .insert(schema.adminUsers)
      .values(admin)
      .returning();
    return created;
  }

  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, email));
    return admin;
  }

  async getStats(): Promise<{
    latestBlock: number;
    totalTransactions: number;
    totalAddresses: number;
    totalContracts: number;
    isConnected: boolean;
  }> {
    const latestBlock = await this.getLatestBlock();
    const syncState = await this.getSyncState();
    
    const [txCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions);
    
    const totalAddresses = await this.getTotalAddresses();
    const totalContracts = await this.getTotalVerifiedContracts();

    return {
      latestBlock,
      totalTransactions: txCount?.count || 0,
      totalAddresses,
      totalContracts,
      isConnected: syncState?.isConnected || false,
    };
  }

  async getAdminStats(): Promise<{
    pendingLogos: number;
    approvedLogos: number;
    rejectedLogos: number;
    totalBlocks: number;
    totalTransactions: number;
  }> {
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tokens)
      .where(eq(schema.tokens.logoStatus, "pending"));
    
    const [approved] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tokens)
      .where(eq(schema.tokens.logoStatus, "approved"));
    
    const [rejected] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tokens)
      .where(eq(schema.tokens.logoStatus, "rejected"));
    
    const [blocks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.blocks);
    
    const [txs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions);

    return {
      pendingLogos: pending?.count || 0,
      approvedLogos: approved?.count || 0,
      rejectedLogos: rejected?.count || 0,
      totalBlocks: blocks?.count || 0,
      totalTransactions: txs?.count || 0,
    };
  }

  async getDailyTransactionStats(days: number): Promise<Array<{
    date: string;
    count: number;
    totalValue: string;
  }>> {
    const startTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    
    const transactions = await db
      .select({
        timestamp: schema.transactions.timestamp,
        value: schema.transactions.value,
      })
      .from(schema.transactions)
      .where(sql`${schema.transactions.timestamp} >= ${startTime}`)
      .orderBy(schema.transactions.timestamp);

    const dailyStats = new Map<string, { count: number; totalValue: bigint }>();
    
    transactions.forEach(tx => {
      const date = new Date(Number(tx.timestamp) * 1000).toISOString().split('T')[0];
      const existing = dailyStats.get(date) || { count: 0, totalValue: BigInt(0) };
      existing.count += 1;
      existing.totalValue += BigInt(tx.value || 0);
      dailyStats.set(date, existing);
    });

    const now = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const stats = dailyStats.get(dateStr) || { count: 0, totalValue: BigInt(0) };
      result.push({
        date: dateStr,
        count: stats.count,
        totalValue: stats.totalValue.toString(),
      });
    }

    return result;
  }
}

export const storage = new DatabaseStorage();
