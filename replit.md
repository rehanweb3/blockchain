# Blockchain Explorer

A comprehensive blockchain explorer web application for tracking real-time blockchain data, verifying smart contracts, and exploring on-chain activity.

## Overview

This is a full-stack blockchain explorer that provides:
- Real-time blockchain data tracking (blocks, transactions, addresses)
- Smart contract verification with Read/Write functionality
- Token exploration and management
- Admin panel for managing token logos and verification
- WebSocket-based live updates
- Wallet integration (MetaMask support)
- Light/Dark theme support

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + Node.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Blockchain Integration**: Ethers.js v6
- **Real-time**: WebSocket (ws library)
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Forms**: React Hook Form + Zod validation

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components (Dashboard, Blocks, Transactions, etc.)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility libraries
│   │   └── main.tsx     # App entry point
│   └── index.html
├── server/          # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── db.ts            # Database connection
│   ├── storage.ts       # Database queries
│   ├── blockchain-sync.ts  # Blockchain synchronization
│   ├── cache.ts         # Redis/Memory cache
│   └── vite.ts          # Vite dev server setup
├── shared/          # Shared types and schemas
│   └── schema.ts        # Database schema (Drizzle ORM)
└── package.json
```

## Recent Changes

- **2025-10-25**: Implemented Token Metadata Admin Panel
  - Extended tokens schema with `description` and `website` fields in PostgreSQL
  - Created public API endpoint `GET /api/token/:address` with rate limiting (60 requests/minute)
  - Returns JSON response with: name, symbol, logo_url, description, website, verified status
  - Added admin route `POST /api/admin/update-token-metadata` with JWT authentication
  - Implemented comprehensive admin dashboard UI for managing token metadata
  - New "Manage Tokens" tab in admin panel with inline editing functionality
  - Added form validation using Zod schemas (description max 1000 chars, website URL validation)
  - Green verified checkmark badge (✓) displayed on approved tokens across all pages
  - Rate limiting middleware protects public endpoints from abuse
  - Secure JWT authentication ensures only admins can modify token metadata
  - Database migration safely applied using `npm run db:push --force`

- **2025-10-22**: Added transaction charts and visualization to dashboard
  - Created `/api/transaction/daily-stats` endpoint for daily transaction aggregation
  - Added `getDailyTransactionStats()` storage method with date grouping and aggregation
  - Implemented two charts on dashboard:
    - Daily Transaction Count (bar chart)
    - Daily Transaction Volume (area chart showing total value transferred)
  - Uses recharts library with proper tooltips, responsive design, and skeleton loaders
  - Smart empty state detection: shows "No transaction data available" when database is empty
  - Charts check for non-zero transaction counts before rendering
  - Caching enabled with 5-minute TTL for performance
  - Data covers last 7 days by default

- **2025-10-22**: Fixed token deployment and logo submission flow
  - Changed default `logoStatus` from "pending" to "no_logo" in database schema
  - Tokens now appear IMMEDIATELY on public blockchain after deployment with placeholder logo
  - Logo submission is now separate from token deployment
  - Only logo submissions (not token deployments) appear in admin "Pending Logo Reviews"
  - Logo rejection now resets to "no_logo" with placeholder instead of keeping rejected status
  - Created default token placeholder logo (SVG) at `/assets/default-token-logo.svg`
  - Updated `storage.getTokens()` to return all tokens regardless of logo approval status
  - Flow: Deploy → Public (placeholder) → Submit Logo → Pending Review → Approve/Reject

- **2025-10-22**: Token deployment functionality completed
  - Added token deployment page with comprehensive form validation
  - Implemented POST /api/token/deploy endpoint (simulated + real blockchain support)
  - Enhanced token detail page with tabbed interface (Overview, Read Contract, Write Contract, Verify, Logo)
  - Fixed critical bugs: BigInt handling, decimals validation, routing
  - Added validation: decimals capped at 0-18, initial supply must be positive integer
  - Updated TypeScript configuration to ES2022 target for BigInt support
  - Integrated logo submission workflow with existing admin approval system
  - Updated navigation with "Deploy Token" link

- **2025-10-22**: Initial Replit setup completed
  - Installed all dependencies
  - Created PostgreSQL database
  - Pushed database schema with Drizzle ORM
  - Configured dev server on port 5000
  - Verified frontend loads correctly
  - WebSocket connectivity established

## Environment Setup

### Required Environment Variables

The following environment variables are configured in Replit:
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

### Optional Environment Variables

For full blockchain functionality, configure these in Replit Secrets:
- `RPC_URL` - Blockchain JSON-RPC endpoint (e.g., Infura, Alchemy)
- `WSS_URL` - Blockchain WebSocket endpoint for real-time updates
- `CHAIN_ID` - Blockchain chain ID (default: "1")
- `NATIVE_TOKEN` - Native token symbol (default: "MTX")
- `VITE_NATIVE_TOKEN` - Frontend native token display (default: "MTX")

**Note**: The app runs without blockchain connectivity. When RPC_URL and WSS_URL are not configured, the blockchain sync is disabled and the explorer runs with an empty database.

## Database Schema

The application uses the following main tables:
- **blocks** - Blockchain blocks
- **transactions** - On-chain transactions
- **addresses** - EOA and contract addresses
- **contracts** - Smart contract details (source code, ABI, verification)
- **tokens** - ERC-20 token information
- **token_transfers** - Token transfer events
- **admin_users** - Admin panel users
- **internal_transactions** - Internal contract calls
- **gas_statistics** - Historical gas price data
- **sync_state** - Blockchain sync status

## Key Features

### 1. Dashboard
- Live blockchain statistics
- Transaction charts and visualization:
  - Daily transaction count (bar chart)
  - Daily transaction volume (area chart)
  - Last 7 days of data with smart empty state handling
- Latest blocks and transactions
- Connection status indicator
- Searchable by address, transaction hash, or block number

### 2. Block Explorer
- View detailed block information
- Transaction list per block
- Miner information
- Gas usage statistics

### 3. Transaction Explorer
- Transaction details with status
- Value transfers
- Gas fees
- Input data

### 4. Address/Contract Details
- Balance and transaction history
- Contract verification status
- For verified contracts: Source code viewing and Read/Write functionality

### 5. Contract Verification
- Submit contract source code
- Specify compiler version and optimization settings
- Automatic ABI extraction
- Read/Write contract interaction after verification

### 6. Token Management
- Token listing and search
- Logo submission for approval
- Token metadata display

### 7. Admin Panel
- Review and approve/reject token logo submissions
- Platform analytics
- User management

## Development

### Running Locally
The dev server runs on port 5000 and serves both frontend and backend:
```bash
npm run dev
```

### Database Migrations
Push schema changes to the database:
```bash
npm run db:push
```

### Build for Production
```bash
npm run build
npm start
```

## Architecture Notes

- **Port 5000**: The only non-firewalled port in Replit - serves both API and frontend
- **Vite Dev Server**: Configured with `allowedHosts: true` to work with Replit's proxy
- **Host Binding**: Server binds to `0.0.0.0` to be accessible
- **Caching**: Uses in-memory cache (Redis optional) for API responses
- **Real-time Updates**: WebSocket server on `/ws` path
- **Type Safety**: Full TypeScript coverage with Zod validation
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries

## User Preferences

None configured yet.

## Known Issues

- Vite HMR WebSocket may show 400 error in proxy environments (cosmetic, doesn't affect functionality)
- Blockchain sync disabled when RPC_URL/WSS_URL not configured (expected behavior)
- Redis cache not configured (using in-memory fallback)

## Future Enhancements

When blockchain connectivity is added:
1. Configure RPC_URL and WSS_URL in Replit Secrets
2. The blockchain sync will automatically start
3. Data will populate in real-time from the blockchain

## Deployment

The app is configured for Replit deployment:
- Production build serves static files from `dist/public`
- Database migrations applied automatically
- Environment variables managed through Replit Secrets
