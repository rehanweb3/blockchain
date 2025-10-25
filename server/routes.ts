import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { initBlockchainSync } from "./blockchain-sync";
import { cache } from "./cache";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import solc from "solc";
import { ethers } from "ethers";
import {
  loginAdminSchema,
  verifyContractSchema,
  submitLogoSchema,
  contractReadSchema,
} from "@shared/schema";
import { generateERC20Source, ERC20_ABI } from "./erc20-template";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.SESSION_SECRET!;

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set for JWT authentication");
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = "./uploads/logos";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function verifyAdminToken(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected to WebSocket");

    ws.on("error", console.error);

    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
    });

    ws.send(JSON.stringify({ type: "connected", message: "WebSocket connected" }));
  });

  function broadcastToClients(message: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  initBlockchainSync();

  app.get("/api/stats", async (req, res) => {
    try {
      const cacheKey = "stats";
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const stats = await storage.getStats();
      await cache.set(cacheKey, stats, { ttl: 10 });
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/blocks/latest", async (req, res) => {
    try {
      const cacheKey = "latest:blocks";
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const blocks = await storage.getLatestBlocks(10);
      await cache.set(cacheKey, blocks, { ttl: 10 });
      res.json(blocks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/block/:number", async (req, res) => {
    try {
      const blockNumber = parseInt(req.params.number);
      const cacheKey = `block:${blockNumber}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const block = await storage.getBlock(blockNumber);
      
      if (!block) {
        return res.status(404).json({ error: "Block not found" });
      }
      
      await cache.set(cacheKey, block, { ttl: 60 });
      res.json(block);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/block/:number/transactions", async (req, res) => {
    try {
      const blockNumber = parseInt(req.params.number);
      const transactions = await storage.getTransactionsByBlock(blockNumber);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transactions/latest", async (req, res) => {
    try {
      const transactions = await storage.getLatestTransactions(10);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tx/:hash", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.hash);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/address/:address", async (req, res) => {
    try {
      const address = req.params.address;
      const addressData = await storage.getAddress(address);
      
      if (!addressData) {
        return res.status(404).json({ error: "Address not found" });
      }

      let contract = null;
      let token = null;
      
      if (addressData.isContract) {
        contract = await storage.getContract(address);
        // Check if this contract is also a token
        token = await storage.getToken(address);
      }

      // If it's a token, return token-specific data structure
      if (token) {
        res.json({
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          totalSupply: token.totalSupply,
          logoUrl: token.logoStatus === "approved" && token.logoUrl 
            ? token.logoUrl 
            : "/assets/default-token-logo.svg",
          logoStatus: token.logoStatus,
          creator: contract?.creator || null,
          contract: contract ? {
            verified: contract.verified,
            abi: contract.abi,
            sourceCode: contract.sourceCode,
            compilerVersion: contract.compilerVersion,
            contractName: contract.contractName,
          } : null,
        });
      } else {
        // Return regular address data
        res.json({
          ...addressData,
          contract,
          tokens: [],
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/address/:address/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByAddress(req.params.address, 50);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tokens", async (req, res) => {
    try {
      const tokens = await storage.getTokens();
      
      const tokensWithLogo = tokens.map(token => ({
        ...token,
        logoUrl: token.logoStatus === "approved" && token.logoUrl 
          ? token.logoUrl 
          : "/assets/default-token-logo.svg",
      }));
      
      res.json(tokensWithLogo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/token/deploy", async (req, res) => {
    try {
      const { name, symbol, initialSupply, decimals, deployer } = req.body;

      if (!name || !symbol || !initialSupply || decimals === undefined || decimals === null || !deployer) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!ethers.isAddress(deployer)) {
        return res.status(400).json({ error: "Invalid deployer address" });
      }

      if (decimals < 0 || decimals > 18) {
        return res.status(400).json({ error: "Decimals must be between 0 and 18" });
      }

      if (!/^\d+$/.test(initialSupply.toString())) {
        return res.status(400).json({ error: "Initial supply must be a positive integer" });
      }

      const sourceCode = generateERC20Source(name, symbol, decimals);
      const contractName = symbol.replace(/[^a-zA-Z0-9]/g, '');

      const input = {
        language: 'Solidity',
        sources: {
          [`${contractName}.sol`]: {
            content: sourceCode
          }
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode']
            }
          },
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      };

      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      
      if (output.errors && output.errors.some((e: any) => e.severity === 'error')) {
        const errorMessages = output.errors.filter((e: any) => e.severity === 'error').map((e: any) => e.message);
        return res.status(500).json({ error: `Compilation failed: ${errorMessages.join(', ')}` });
      }

      const contract = output.contracts[`${contractName}.sol`][contractName];
      const bytecode = contract.evm.bytecode.object;
      const abi = contract.abi;

      console.log(`✅ Compiled ${name} (${symbol}) successfully`);

      const rpcUrl = process.env.RPC_URL;
      if (!rpcUrl) {
        const mockAddress = ethers.Wallet.createRandom().address;
        console.log(`⚠️  No RPC_URL configured. Simulating deployment at ${mockAddress}`);

        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        await storage.upsertAddress({
          address: mockAddress,
          balance: "0",
          type: "Contract",
          isContract: true,
          firstSeen: currentTimestamp,
          lastSeen: currentTimestamp,
          transactionCount: 0,
        });

        await storage.insertContract({
          address: mockAddress,
          creator: deployer,
          creationTxHash: null,
          sourceCode: sourceCode,
          compilerVersion: "0.8.0+commit.c7dfd78e",
          optimization: true,
          optimizationRuns: 200,
          constructorArgs: initialSupply.toString(),
          abi: JSON.stringify(abi),
          verified: false,
          verifiedAt: null,
          contractName: contractName,
        });

        await storage.upsertToken({
          address: mockAddress,
          name: name,
          symbol: symbol,
          decimals: decimals,
          totalSupply: (BigInt(initialSupply) * (BigInt(10) ** BigInt(decimals))).toString(),
          logoUrl: null,
          logoStatus: "no_logo",
          submittedBy: null,
          submittedAt: null,
          reviewedAt: null,
          reviewedBy: null,
        });

        broadcastToClients({
          type: "token_deployed",
          data: {
            address: mockAddress,
            name,
            symbol,
            deployer,
          },
        });

        return res.json({
          address: mockAddress,
          txHash: null,
          message: "Token simulated successfully (configure RPC_URL for real deployment)",
        });
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
      
      if (!privateKey) {
        return res.status(500).json({ 
          error: "DEPLOYER_PRIVATE_KEY not configured. Cannot deploy to blockchain." 
        });
      }

      const wallet = new ethers.Wallet(privateKey, provider);
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      
      console.log(`🚀 Deploying ${name} (${symbol}) to blockchain...`);
      const contractInstance = await factory.deploy(initialSupply);
      await contractInstance.waitForDeployment();
      
      const deployedAddress = await contractInstance.getAddress();
      const deployTx = contractInstance.deploymentTransaction();
      
      console.log(`✅ Token deployed at ${deployedAddress}`);
      console.log(`📝 Transaction: ${deployTx?.hash}`);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      await storage.upsertAddress({
        address: deployedAddress,
        balance: "0",
        type: "Contract",
        isContract: true,
        firstSeen: currentTimestamp,
        lastSeen: currentTimestamp,
        transactionCount: 0,
      });

      await storage.insertContract({
        address: deployedAddress,
        creator: deployer,
        creationTxHash: deployTx?.hash || null,
        sourceCode: sourceCode,
        compilerVersion: "0.8.0+commit.c7dfd78e",
        optimization: true,
        optimizationRuns: 200,
        constructorArgs: initialSupply.toString(),
        abi: JSON.stringify(abi),
        verified: false,
        verifiedAt: null,
        contractName: contractName,
      });

      await storage.upsertToken({
        address: deployedAddress,
        name: name,
        symbol: symbol,
        decimals: decimals,
        totalSupply: (BigInt(initialSupply) * (BigInt(10) ** BigInt(decimals))).toString(),
        logoUrl: null,
        logoStatus: "no_logo",
        submittedBy: null,
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: null,
      });

      broadcastToClients({
        type: "token_deployed",
        data: {
          address: deployedAddress,
          name,
          symbol,
          deployer,
        },
      });

      res.json({
        address: deployedAddress,
        txHash: deployTx?.hash,
        message: "Token deployed successfully",
      });
    } catch (error: any) {
      console.error("Token deployment error:", error);
      res.status(500).json({ error: error.message || "Failed to deploy token" });
    }
  });

  app.get("/api/contracts", async (req, res) => {
    try {
      const contracts = await storage.getVerifiedContracts();
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
        const tx = await storage.getTransaction(query);
        if (tx) {
          return res.json({ type: "transaction", data: tx });
        }

        const block = await storage.getBlockByHash(query);
        if (block) {
          return res.json({ type: "block", data: block });
        }
      }

      if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
        const address = await storage.getAddress(query);
        if (address) {
          return res.json({ type: "address", data: address });
        }
      }

      if (/^\d+$/.test(query)) {
        const blockNumber = parseInt(query);
        const block = await storage.getBlock(blockNumber);
        if (block) {
          return res.json({ type: "block", data: block });
        }
      }

      res.status(404).json({ error: "Not found" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-contract", async (req, res) => {
    try {
      const validatedData = verifyContractSchema.parse(req.body);
      const { address, sourceCode, contractName, compilerVersion, optimization, optimizationRuns, constructorArgs } = validatedData;

      const contract = await storage.getContract(address);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (contract.verified) {
        return res.status(400).json({ error: "Contract already verified" });
      }

      try {
        const input = {
          language: "Solidity",
          sources: {
            [`${contractName}.sol`]: {
              content: sourceCode,
            },
          },
          settings: {
            optimizer: {
              enabled: optimization,
              runs: optimizationRuns || 200,
            },
            outputSelection: {
              "*": {
                "*": ["abi", "evm.bytecode"],
              },
            },
          },
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));

        if (output.errors && output.errors.some((e: any) => e.severity === "error")) {
          return res.status(400).json({
            error: "Compilation failed",
            details: output.errors,
          });
        }

        const compiledContract = output.contracts[`${contractName}.sol`]?.[contractName];
        if (!compiledContract) {
          return res.status(400).json({ error: "Contract not found in compilation output" });
        }

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const deployedCode = await provider.getCode(address);
        const compiledCode = "0x" + compiledContract.evm.bytecode.object;

        const match = deployedCode.toLowerCase().includes(compiledCode.slice(2, 100).toLowerCase());

        if (match) {
          await storage.updateContract(address, {
            sourceCode,
            compilerVersion,
            optimization,
            optimizationRuns: optimization ? optimizationRuns : null,
            constructorArgs: constructorArgs || null,
            abi: compiledContract.abi,
            verified: true,
            verifiedAt: new Date(),
            contractName,
          });

          broadcastToClients({
            type: "contractVerified",
            address,
          });

          res.json({ success: true, message: "Contract verified successfully" });
        } else {
          res.status(400).json({ error: "Bytecode does not match. Please verify your source code and compiler settings." });
        }
      } catch (compileError: any) {
        res.status(400).json({
          error: "Compilation error",
          details: compileError.message,
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contract/:address/abi", async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.address);
      
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      if (!contract.verified || !contract.abi) {
        return res.status(400).json({ error: "Contract not verified or ABI not available" });
      }

      res.json({ abi: contract.abi });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/contract/:address/read", async (req, res) => {
    try {
      const { functionName, args } = contractReadSchema.parse(req.body);
      const address = req.params.address;

      const contract = await storage.getContract(address);
      
      if (!contract || !contract.verified || !contract.abi) {
        return res.status(400).json({ error: "Contract not verified or ABI not available" });
      }

      if (!process.env.RPC_URL) {
        return res.status(503).json({ error: "RPC connection not configured" });
      }

      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const contractInstance = new ethers.Contract(address, contract.abi as any, provider);

      const result = await contractInstance[functionName](...args);
      
      res.json({ result: result.toString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/transaction/daily-stats", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cacheKey = `daily-tx-stats:${days}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const dailyStats = await storage.getDailyTransactionStats(days);
      
      await cache.set(cacheKey, dailyStats, { ttl: 300 });
      res.json(dailyStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/gas/statistics", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const cacheKey = `gas:stats:${limit}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const blocks = await storage.getLatestBlocks(limit);
      
      const gasStats = blocks.map(block => ({
        blockNumber: block.blockNumber,
        timestamp: block.timestamp,
        baseFeePerGas: block.baseFeePerGas ? (BigInt(block.baseFeePerGas) / BigInt(1e9)).toString() : "0",
        gasUsed: block.gasUsed,
        gasLimit: block.gasLimit,
        utilization: ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2),
      }));

      await cache.set(cacheKey, gasStats, { ttl: 60 });
      res.json(gasStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tx/:hash/internal", async (req, res) => {
    try {
      const txHash = req.params.hash;
      const cacheKey = `internal-tx:${txHash}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/token/submit-logo", upload.single("logo"), async (req, res) => {
    try {
      const { tokenAddress, submittedBy } = req.body;
      
      if (!tokenAddress || !submittedBy) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Logo file is required" });
      }

      const token = await storage.getToken(tokenAddress);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }

      const logoUrl = `/uploads/logos/${req.file.filename}`;

      await storage.upsertToken({
        address: tokenAddress,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        totalSupply: token.totalSupply,
        logoUrl,
        logoStatus: "pending",
        submittedBy,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
      });

      broadcastToClients({
        type: "logoSubmitted",
        tokenAddress,
      });

      res.json({ success: true, message: "Logo submitted for review" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = loginAdminSchema.parse(req.body);

      const admin = await storage.getAdminByEmail(email);
      
      if (!admin) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (email === adminEmail && password === adminPassword) {
          const passwordHash = await bcrypt.hash(password, 10);
          await storage.createAdminUser({
            email,
            passwordHash,
            role: "admin",
          });

          const token = jwt.sign({ email, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
          return res.json({ token });
        }

        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/stats", verifyAdminToken, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/review-logos", verifyAdminToken, async (req, res) => {
    try {
      const pendingLogos = await storage.getTokensByLogoStatus("pending");
      res.json(pendingLogos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/approve-logo/:tokenAddress", verifyAdminToken, async (req: any, res) => {
    try {
      const { tokenAddress } = req.params;
      await storage.updateTokenLogoStatus(tokenAddress, "approved", req.admin.email);

      broadcastToClients({
        type: "logoStatusChanged",
        tokenAddress,
        status: "approved",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/reject-logo/:tokenAddress", verifyAdminToken, async (req: any, res) => {
    try {
      const { tokenAddress } = req.params;
      
      const token = await storage.getToken(tokenAddress);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }

      await storage.upsertToken({
        address: tokenAddress,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        totalSupply: token.totalSupply,
        logoUrl: null,
        logoStatus: "no_logo",
        submittedBy: null,
        submittedAt: null,
        reviewedAt: new Date(),
        reviewedBy: req.admin.email,
      });

      broadcastToClients({
        type: "logoStatusChanged",
        tokenAddress,
        status: "no_logo",
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });
  
  const express = await import("express");
  app.use("/uploads", express.default.static("uploads"));

  return httpServer;
}
