import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Wallet, FileCode, CheckCircle2, Coins, ArrowRightLeft } from "lucide-react";
import { truncateHash, truncateAddress, formatTimestamp, formatWei, copyToClipboard, formatNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Address, Transaction, Token, Contract } from "@shared/schema";

interface AddressData extends Address {
  contract?: Contract;
  tokens?: Array<Token & { balance: string }>;
}

export default function AddressDetail() {
  const [, params] = useRoute("/address/:address");
  const address = params?.address;
  const { toast } = useToast();

  const { data: addressData, isLoading } = useQuery<AddressData>({
    queryKey: ["/api/address", address],
    enabled: !!address,
  });

  const { data: transactions, isLoading: txnsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/address", address, "transactions"],
    enabled: !!address,
  });

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!addressData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Address Not Found</CardTitle>
            <CardDescription>The address you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <a>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nativeToken = import.meta.env.VITE_NATIVE_TOKEN || "MTX";
  const isContract = addressData.isContract;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <a>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </a>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3 flex-wrap">
            {isContract ? (
              <FileCode className="h-8 w-8 text-primary" />
            ) : (
              <Wallet className="h-8 w-8 text-primary" />
            )}
            {isContract ? "Contract" : "Address"}
            {isContract && addressData.contract?.verified && (
              <Badge variant="default" className="text-base">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Verified
              </Badge>
            )}
          </h1>
        </div>
      </div>

      {/* Address Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded break-all" data-testid="text-address">
              {addressData.address}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => handleCopy(addressData.address, "Address")}
              data-testid="button-copy-address"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Balance</div>
              <div className="font-semibold text-xl" data-testid="text-balance">
                {formatWei(addressData.balance)} {nativeToken}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Transactions</div>
              <div className="font-semibold text-xl">{formatNumber(addressData.transactionCount)}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Type</div>
              <Badge variant={isContract ? "default" : "secondary"} className="text-sm">
                {isContract ? "Smart Contract" : "EOA (Externally Owned Account)"}
              </Badge>
            </div>
          </div>

          {isContract && addressData.contract && (
            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Creator</div>
                  <Link href={`/address/${addressData.contract.creator}`}>
                    <a className="font-mono text-sm hover:text-primary" data-testid="link-creator">
                      {addressData.contract.creator}
                    </a>
                  </Link>
                </div>

                {addressData.contract.contractName && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Contract Name</div>
                    <div className="font-semibold">{addressData.contract.contractName}</div>
                  </div>
                )}

                {addressData.contract.compilerVersion && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Compiler Version</div>
                    <div className="font-mono text-sm">{addressData.contract.compilerVersion}</div>
                  </div>
                )}

                {addressData.contract.optimization !== null && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Optimization</div>
                    <div className="font-semibold">
                      {addressData.contract.optimization ? `Enabled (${addressData.contract.optimizationRuns} runs)` : "Disabled"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className={`grid w-full ${isContract && addressData.contract?.verified ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            Transactions ({addressData.transactionCount})
          </TabsTrigger>
          <TabsTrigger value="tokens" data-testid="tab-tokens">
            Tokens ({addressData.tokens?.length || 0})
          </TabsTrigger>
          {isContract && addressData.contract?.verified && (
            <TabsTrigger value="contract" data-testid="tab-contract">Contract</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transactions
              </CardTitle>
              <CardDescription>Recent transactions involving this address</CardDescription>
            </CardHeader>
            <CardContent>
              {txnsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 20).map((tx) => (
                    <Link key={tx.txHash} href={`/tx/${tx.txHash}`}>
                      <a>
                        <div className="flex items-center gap-4 p-4 rounded-lg hover-elevate active-elevate-2 border" data-testid={`tx-${tx.txHash}`}>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{truncateHash(tx.txHash)}</span>
                              <Badge variant={tx.status === 1 ? "default" : "destructive"}>
                                {tx.status === 1 ? "Success" : "Failed"}
                              </Badge>
                              {tx.fromAddress.toLowerCase() === addressData.address.toLowerCase() && (
                                <Badge variant="secondary">OUT</Badge>
                              )}
                              {tx.toAddress?.toLowerCase() === addressData.address.toLowerCase() && (
                                <Badge variant="secondary">IN</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>From {truncateAddress(tx.fromAddress)}</span>
                              <span>→</span>
                              <span>{tx.toAddress ? truncateAddress(tx.toAddress) : "Contract Creation"}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">Value:</span>
                              <span className="font-semibold">{formatWei(tx.value)} {nativeToken}</span>
                              <span className="text-muted-foreground ml-auto">{formatTimestamp(tx.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Token Holdings
              </CardTitle>
              <CardDescription>Tokens owned by this address</CardDescription>
            </CardHeader>
            <CardContent>
              {addressData.tokens && addressData.tokens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addressData.tokens.map((token) => (
                    <Link key={token.address} href={`/address/${token.address}`}>
                      <a>
                        <div className="flex items-center gap-4 p-4 rounded-lg hover-elevate active-elevate-2 border" data-testid={`token-${token.address}`}>
                          {token.logoUrl && token.logoStatus === "approved" ? (
                            <img src={token.logoUrl} alt={token.symbol} className="h-10 w-10 rounded-full" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Coins className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground truncate">{token.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatWei(token.balance, token.decimals)}</div>
                            <div className="text-sm text-muted-foreground">{token.symbol}</div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tokens found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isContract && addressData.contract?.verified && (
          <TabsContent value="contract">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Contract Source Code
                </CardTitle>
                <CardDescription>Verified source code for this contract</CardDescription>
              </CardHeader>
              <CardContent>
                {addressData.contract.sourceCode ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-[600px]">
                        <code>{addressData.contract.sourceCode}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(addressData.contract!.sourceCode!, "Source code")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {addressData.contract.abi && (
                      <div>
                        <h3 className="font-semibold mb-2">Contract ABI</h3>
                        <div className="relative">
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96">
                            <code>{JSON.stringify(addressData.contract.abi, null, 2)}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopy(JSON.stringify(addressData.contract!.abi), "ABI")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No source code available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
