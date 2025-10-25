import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Box, Clock, Users, Fuel, ArrowRightLeft } from "lucide-react";
import { truncateHash, truncateAddress, formatTimestamp, formatDate, formatNumber, formatWei, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Block, Transaction } from "@shared/schema";

export default function BlockDetail() {
  const [, params] = useRoute("/block/:number");
  const blockNumber = params?.number;
  const { toast } = useToast();

  const { data: block, isLoading } = useQuery<Block>({
    queryKey: ["/api/block", blockNumber],
    enabled: !!blockNumber,
  });

  const { data: transactions, isLoading: txnsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/block", blockNumber, "transactions"],
    enabled: !!blockNumber,
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

  if (!block) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Block Not Found</CardTitle>
            <CardDescription>The block you're looking for doesn't exist.</CardDescription>
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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Box className="h-8 w-8 text-primary" />
            Block #{formatNumber(block.blockNumber)}
          </h1>
          <p className="text-muted-foreground mt-1">
            <Clock className="inline h-4 w-4 mr-1" />
            {formatDate(block.timestamp)}
          </p>
        </div>
      </div>

      {/* Block Details */}
      <Card>
        <CardHeader>
          <CardTitle>Block Information</CardTitle>
          <CardDescription>Detailed information about this block</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Block Height</div>
                <div className="font-semibold text-lg" data-testid="text-block-number">{formatNumber(block.blockNumber)}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Block Hash</div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded break-all" data-testid="text-block-hash">
                    {block.hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleCopy(block.hash, "Block hash")}
                    data-testid="button-copy-hash"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Timestamp</div>
                <div className="font-semibold">{formatTimestamp(block.timestamp)} ({formatDate(block.timestamp)})</div>
              </div>

              <div className="w-full">
  <div className="text-sm text-muted-foreground mb-1">Miner</div>

  <div className="flex items-center gap-2 min-w-0">
    <Link href={`/address/${block.miner}`} className="flex-1 min-w-0">
      <a
        className="font-mono text-sm text-ellipsis truncate block hover:text-primary"
        data-testid="link-miner"
        title={block.miner}
      >
        {block.miner}
      </a>
    </Link>

    <Button
      variant="ghost"
      size="icon"
      className="flex-shrink-0"
      onClick={() => handleCopy(block.miner, 'Miner address')}
      data-testid="button-copy-miner"
    >
      <Copy className="h-4 w-4" />
    </Button>
  </div>
</div>

            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Transactions</div>
                <div className="font-semibold text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                  {formatNumber(block.transactionCount)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Gas Used</div>
                <div className="font-semibold">
                  {formatNumber(block.gasUsed)} / {formatNumber(block.gasLimit)}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>

              {block.baseFeePerGas && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Base Fee Per Gas</div>
                  <div className="font-semibold">{formatWei(block.baseFeePerGas, 9)} Gwei</div>
                </div>
              )}

              {block.burntFees && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Burnt Fees</div>
                  <div className="font-semibold">{formatWei(block.burntFees)} {nativeToken}</div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground mb-1">Block Size</div>
                <div className="font-semibold">{formatNumber(block.size)} bytes</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transactions ({block.transactionCount})
          </CardTitle>
          <CardDescription>All transactions in this block</CardDescription>
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
              {transactions.map((tx) => (
                <Link key={tx.txHash} href={`/tx/${tx.txHash}`}>
                  <a>
                    <div className="flex items-center gap-4 p-4 rounded-lg hover-elevate active-elevate-2 border" data-testid={`tx-${tx.txHash}`}>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{truncateHash(tx.txHash)}</span>
                          <Badge variant={tx.status === 1 ? "default" : "destructive"}>
                            {tx.status === 1 ? "Success" : "Failed"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>From {truncateAddress(tx.fromAddress)}</span>
                          <span>→</span>
                          <span>{tx.toAddress ? truncateAddress(tx.toAddress) : "Contract Creation"}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Value: </span>
                          <span className="font-semibold">{formatWei(tx.value)} {nativeToken}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions in this block
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
