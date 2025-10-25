import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { useWallet } from "@/hooks/use-wallet";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect } from "react";

import Dashboard from "@/pages/dashboard";
import Blocks from "@/pages/blocks";
import Transactions from "@/pages/transactions";
import BlockDetail from "@/pages/block-detail";
import TransactionDetail from "@/pages/transaction-detail";
import AddressDetail from "@/pages/address-detail";
import TokenDetail from "@/pages/token-detail";
import Tokens from "@/pages/tokens";
import Contracts from "@/pages/contracts";
import VerifyContract from "@/pages/verify-contract";
import DeployToken from "@/pages/deploy-token";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/blocks" component={Blocks} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/block/:number" component={BlockDetail} />
      <Route path="/tx/:hash" component={TransactionDetail} />
      <Route path="/token/:address" component={TokenDetail} />
      <Route path="/address/:address" component={AddressDetail} />
      <Route path="/tokens" component={Tokens} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/verify-contract" component={VerifyContract} />
      <Route path="/deploy-token" component={DeployToken} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const { account, connectWallet, disconnectWallet } = useWallet();
  const { isConnected } = useWebSocket();
  
  const isAdminRoute = location.startsWith("/admin");

  const handleSearch = (query: string) => {
    query = query.trim();
    
    if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
      window.location.href = `/tx/${query}`;
    } else if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
      window.location.href = `/address/${query}`;
    } else if (/^\d+$/.test(query)) {
      window.location.href = `/block/${query}`;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            {!isAdminRoute && (
              <Header
                onSearch={handleSearch}
                connectedWallet={account}
                onConnectWallet={connectWallet}
                onDisconnectWallet={disconnectWallet}
              />
            )}
            <main>
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
