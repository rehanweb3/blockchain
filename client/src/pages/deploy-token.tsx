import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coins, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/use-wallet";

async function apiRequest(method: string, url: string, body?: any) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}

export default function DeployToken() {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [initialSupply, setInitialSupply] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const { toast } = useToast();
  const { account, connectWallet } = useWallet();

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error("Please connect your wallet first");
      }

      return apiRequest("POST", "/api/token/deploy", {
        name: tokenName,
        symbol: tokenSymbol,
        initialSupply,
        decimals: parseInt(decimals),
        deployer: account,
      });
    },
    onSuccess: (data) => {
      setDeployedAddress(data.address);
      toast({
        title: "Token deployed successfully!",
        description: `Your token contract has been deployed at ${data.address}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deployment failed",
        description: error.message || "Failed to deploy token. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenName || !tokenSymbol || !initialSupply || !decimals) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to deploy a token",
        variant: "destructive",
      });
      return;
    }

    deployMutation.mutate();
  };

  if (deployedAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
            <CardTitle className="text-2xl">Token Deployed Successfully!</CardTitle>
            <CardDescription>
              Your ERC-20 token has been deployed to the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Contract Address</p>
              <code className="text-sm font-mono break-all">{deployedAddress}</code>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Next Steps:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your token is now visible in the token list (Unverified)</li>
                <li>Verify your contract to unlock Read/Write functionality</li>
                <li>Submit a logo for admin approval to enhance your listing</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Link href={`/token/${deployedAddress}`}>
                <Button className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Token
                </Button>
              </Link>
              <Link href="/verify-contract">
                <Button variant="outline" className="flex-1">
                  Verify Contract
                </Button>
              </Link>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setDeployedAddress(null);
                setTokenName("");
                setTokenSymbol("");
                setInitialSupply("");
                setDecimals("18");
              }}
            >
              Deploy Another Token
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-2">
            <Coins className="h-10 w-10 text-primary" />
            Deploy ERC-20 Token
          </h1>
          <p className="text-muted-foreground">
            Create your own ERC-20 token on the blockchain
          </p>
        </div>

        {!account && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 dark:text-yellow-500">⚠️</div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Wallet Connection Required</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    You need to connect your wallet to deploy a token contract.
                  </p>
                  <Button onClick={connectWallet} size="sm">
                    Connect Wallet
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Enter the details for your new ERC-20 token. Make sure all information is correct.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Token Name *</Label>
                <Input
                  id="tokenName"
                  placeholder="e.g., My Amazing Token"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  disabled={deployMutation.isPending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The full name of your token (e.g., "Ethereum")
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenSymbol">Token Symbol *</Label>
                <Input
                  id="tokenSymbol"
                  placeholder="e.g., MAT"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  maxLength={10}
                  disabled={deployMutation.isPending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A short identifier for your token (e.g., "ETH")
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialSupply">Initial Supply *</Label>
                <Input
                  id="initialSupply"
                  type="number"
                  placeholder="e.g., 1000000"
                  value={initialSupply}
                  onChange={(e) => setInitialSupply(e.target.value)}
                  min="1"
                  disabled={deployMutation.isPending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The initial number of tokens to mint (whole numbers)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="decimals">Decimals *</Label>
                <Input
                  id="decimals"
                  type="number"
                  placeholder="18"
                  value={decimals}
                  onChange={(e) => setDecimals(e.target.value)}
                  min="0"
                  max="18"
                  disabled={deployMutation.isPending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Number of decimal places (18 is standard for most tokens)
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Important Notes:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Your token will be deployed as an ERC-20 standard token</li>
                  <li>The deployer address (your wallet) will receive the initial supply</li>
                  <li>Token will appear as "Unverified" until you verify the contract</li>
                  <li>You can verify the contract and submit a logo after deployment</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={deployMutation.isPending || !account}
              >
                {deployMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Deploying Token...
                  </>
                ) : (
                  <>
                    <Coins className="h-5 w-5 mr-2" />
                    Deploy Token
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-500">ℹ️</div>
              <div className="text-sm">
                <p className="font-medium mb-1">Gas Fees Required</p>
                <p className="text-muted-foreground">
                  Deploying a token requires gas fees paid in the native blockchain token. 
                  Make sure your wallet has sufficient balance to cover the deployment cost.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
