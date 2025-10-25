import { sql } from "drizzle-orm";
import { pgTable, text, varchar, bigint, integer, timestamp, boolean, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Blocks table
export const blocks = pgTable("blocks", {
  blockNumber: bigint("block_number", { mode: "number" }).primaryKey(),
  hash: varchar("hash", { length: 66 }).notNull().unique(),
  miner: varchar("miner", { length: 42 }).notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  gasUsed: varchar("gas_used", { length: 50 }).notNull(),
  gasLimit: varchar("gas_limit", { length: 50 }).notNull(),
  size: integer("size").notNull(),
  baseFeePerGas: varchar("base_fee_per_gas", { length: 50 }),
  burntFees: varchar("burnt_fees", { length: 50 }),
  transactionCount: integer("transaction_count").notNull().default(0),
}, (table) => ({
  timestampIdx: index("blocks_timestamp_idx").on(table.timestamp),
  minerIdx: index("blocks_miner_idx").on(table.miner),
}));

// Transactions table
export const transactions = pgTable("transactions", {
  txHash: varchar("tx_hash", { length: 66 }).primaryKey(),
  blockNumber: bigint("block_number", { mode: "number" }).notNull().references(() => blocks.blockNumber),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }),
  value: varchar("value", { length: 78 }).notNull(),
  gasPrice: varchar("gas_price", { length: 50 }).notNull(),
  gasUsed: varchar("gas_used", { length: 50 }).notNull(),
  status: integer("status").notNull(),
  nonce: integer("nonce").notNull(),
  transactionIndex: integer("transaction_index").notNull(),
  input: text("input"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  method: varchar("method", { length: 100 }),
  contractCreated: varchar("contract_created", { length: 42 }),
  logs: jsonb("logs").default([]),
}, (table) => ({
  blockNumberIdx: index("transactions_block_number_idx").on(table.blockNumber),
  fromAddressIdx: index("transactions_from_address_idx").on(table.fromAddress),
  toAddressIdx: index("transactions_to_address_idx").on(table.toAddress),
  timestampIdx: index("transactions_timestamp_idx").on(table.timestamp),
}));

// Addresses table
export const addresses = pgTable("addresses", {
  address: varchar("address", { length: 42 }).primaryKey(),
  balance: varchar("balance", { length: 78 }).notNull().default("0"),
  type: varchar("type", { length: 20 }).notNull().default("EOA"),
  isContract: boolean("is_contract").notNull().default(false),
  firstSeen: bigint("first_seen", { mode: "number" }).notNull(),
  lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
  transactionCount: integer("transaction_count").notNull().default(0),
}, (table) => ({
  typeIdx: index("addresses_type_idx").on(table.type),
}));

// Contracts table
export const contracts = pgTable("contracts", {
  address: varchar("address", { length: 42 }).primaryKey().references(() => addresses.address),
  creator: varchar("creator", { length: 42 }).notNull(),
  creationTxHash: varchar("creation_tx_hash", { length: 66 }),
  sourceCode: text("source_code"),
  compilerVersion: varchar("compiler_version", { length: 50 }),
  optimization: boolean("optimization"),
  optimizationRuns: integer("optimization_runs"),
  constructorArgs: text("constructor_args"),
  abi: jsonb("abi"),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  contractName: varchar("contract_name", { length: 100 }),
}, (table) => ({
  verifiedIdx: index("contracts_verified_idx").on(table.verified),
  creatorIdx: index("contracts_creator_idx").on(table.creator),
}));

// Tokens table
export const tokens = pgTable("tokens", {
  address: varchar("address", { length: 42 }).primaryKey().references(() => addresses.address),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  decimals: integer("decimals").notNull(),
  totalSupply: varchar("total_supply", { length: 78 }),
  description: text("description"),
  website: text("website"),
  logoUrl: text("logo_url"),
  logoStatus: varchar("logo_status", { length: 20 }).notNull().default("no_logo"),
  submittedBy: varchar("submitted_by", { length: 42 }),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
}, (table) => ({
  logoStatusIdx: index("tokens_logo_status_idx").on(table.logoStatus),
  symbolIdx: index("tokens_symbol_idx").on(table.symbol),
}));

// Token transfers table
export const tokenTransfers = pgTable("token_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txHash: varchar("tx_hash", { length: 66 }).notNull().references(() => transactions.txHash),
  tokenAddress: varchar("token_address", { length: 42 }).notNull().references(() => tokens.address),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }).notNull(),
  value: varchar("value", { length: 78 }).notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
}, (table) => ({
  txHashIdx: index("token_transfers_tx_hash_idx").on(table.txHash),
  tokenAddressIdx: index("token_transfers_token_address_idx").on(table.tokenAddress),
  fromAddressIdx: index("token_transfers_from_address_idx").on(table.fromAddress),
  toAddressIdx: index("token_transfers_to_address_idx").on(table.toAddress),
}));

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Internal transactions table
export const internalTransactions = pgTable("internal_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentTxHash: varchar("parent_tx_hash", { length: 66 }).notNull().references(() => transactions.txHash),
  traceType: varchar("trace_type", { length: 20 }).notNull(),
  callType: varchar("call_type", { length: 20 }),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }),
  value: varchar("value", { length: 78 }).notNull(),
  gas: varchar("gas", { length: 50 }).notNull(),
  gasUsed: varchar("gas_used", { length: 50 }),
  input: text("input"),
  output: text("output"),
  traceAddress: jsonb("trace_address"),
  blockNumber: bigint("block_number", { mode: "number" }).notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
}, (table) => ({
  parentTxHashIdx: index("internal_tx_parent_hash_idx").on(table.parentTxHash),
  fromAddressIdx: index("internal_tx_from_address_idx").on(table.fromAddress),
  toAddressIdx: index("internal_tx_to_address_idx").on(table.toAddress),
  blockNumberIdx: index("internal_tx_block_number_idx").on(table.blockNumber),
}));

// Gas statistics table (stores historical gas fee data)
export const gasStatistics = pgTable("gas_statistics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockNumber: bigint("block_number", { mode: "number" }).notNull().unique(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  baseFeePerGas: varchar("base_fee_per_gas", { length: 50 }),
  avgGasPrice: varchar("avg_gas_price", { length: 50 }).notNull(),
  minGasPrice: varchar("min_gas_price", { length: 50 }).notNull(),
  maxGasPrice: varchar("max_gas_price", { length: 50 }).notNull(),
  gasUsed: varchar("gas_used", { length: 50 }).notNull(),
  gasLimit: varchar("gas_limit", { length: 50 }).notNull(),
  transactionCount: integer("transaction_count").notNull(),
}, (table) => ({
  timestampIdx: index("gas_stats_timestamp_idx").on(table.timestamp),
  blockNumberIdx: index("gas_stats_block_number_idx").on(table.blockNumber),
}));

// Sync state table (tracks last synced block)
export const syncState = pgTable("sync_state", {
  id: integer("id").primaryKey().default(1),
  lastSyncedBlock: bigint("last_synced_block", { mode: "number" }).notNull().default(0),
  lastSyncedAt: timestamp("last_synced_at"),
  isConnected: boolean("is_connected").notNull().default(false),
});

// Relations
export const blocksRelations = relations(blocks, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  block: one(blocks, {
    fields: [transactions.blockNumber],
    references: [blocks.blockNumber],
  }),
  tokenTransfers: many(tokenTransfers),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  contract: one(contracts, {
    fields: [addresses.address],
    references: [contracts.address],
  }),
  token: one(tokens, {
    fields: [addresses.address],
    references: [tokens.address],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  address: one(addresses, {
    fields: [contracts.address],
    references: [addresses.address],
  }),
}));

export const tokensRelations = relations(tokens, ({ one, many }) => ({
  address: one(addresses, {
    fields: [tokens.address],
    references: [addresses.address],
  }),
  transfers: many(tokenTransfers),
}));

export const tokenTransfersRelations = relations(tokenTransfers, ({ one }) => ({
  transaction: one(transactions, {
    fields: [tokenTransfers.txHash],
    references: [transactions.txHash],
  }),
  token: one(tokens, {
    fields: [tokenTransfers.tokenAddress],
    references: [tokens.address],
  }),
}));

export const internalTransactionsRelations = relations(internalTransactions, ({ one }) => ({
  transaction: one(transactions, {
    fields: [internalTransactions.parentTxHash],
    references: [transactions.txHash],
  }),
}));

// Insert schemas
export const insertBlockSchema = createInsertSchema(blocks).omit({
  blockNumber: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  txHash: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  address: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  address: true,
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  address: true,
});

export const insertTokenTransferSchema = createInsertSchema(tokenTransfers).omit({
  id: true,
});

export const insertInternalTransactionSchema = createInsertSchema(internalTransactions).omit({
  id: true,
});

export const insertGasStatisticsSchema = createInsertSchema(gasStatistics).omit({
  id: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const loginAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const verifyContractSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  sourceCode: z.string().min(1),
  compilerVersion: z.string().min(1),
  optimization: z.boolean(),
  optimizationRuns: z.number().optional(),
  constructorArgs: z.string().optional(),
  contractName: z.string().min(1),
});

export const submitLogoSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  submittedBy: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export const contractReadSchema = z.object({
  functionName: z.string().min(1),
  args: z.array(z.any()).optional().default([]),
});

export const updateTokenMetadataSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().min(1).max(100).optional(),
  symbol: z.string().min(1).max(20).optional(),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

// Export types
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type Token = typeof tokens.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;

export type TokenTransfer = typeof tokenTransfers.$inferSelect;
export type InsertTokenTransfer = z.infer<typeof insertTokenTransferSchema>;

export type InternalTransaction = typeof internalTransactions.$inferSelect;
export type InsertInternalTransaction = z.infer<typeof insertInternalTransactionSchema>;

export type GasStatistics = typeof gasStatistics.$inferSelect;
export type InsertGasStatistics = z.infer<typeof insertGasStatisticsSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type SyncState = typeof syncState.$inferSelect;

export type LoginAdmin = z.infer<typeof loginAdminSchema>;
export type VerifyContract = z.infer<typeof verifyContractSchema>;
export type SubmitLogo = z.infer<typeof submitLogoSchema>;
export type ContractRead = z.infer<typeof contractReadSchema>;
export type UpdateTokenMetadata = z.infer<typeof updateTokenMetadataSchema>;
