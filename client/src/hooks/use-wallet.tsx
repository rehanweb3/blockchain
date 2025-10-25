import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkIfWalletIsConnected();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  const checkIfWalletIsConnected = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask not detected",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      toast({
        title: "Wallet connected",
        description: "Your wallet has been connected successfully",
      });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  return {
    account,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
