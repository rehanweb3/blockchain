import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, Clock } from "lucide-react";
import { truncateHash, truncateAddress, formatTimestamp, formatWei } from "@/lib/utils";
import type { Transaction } from "@shared/schema";

export default function Transactions() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions/latest"],
  });

  const nativeToken = import.meta.env.VITE_NATIVE_TOKEN || "MTX";

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <ArrowRightLeft className="h-10 w-10 text-primary" />
          Latest Transactions
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse the most recent transactions on the blockchain
        </p>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {transactions?.length || 0} most recent transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <Link key={tx.txHash} href={`/tx/${tx.txHash}`}>
                  <Card className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`tx-item-${tx.txHash}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-accent/10 flex items-center justify-center">
                          <ArrowRightLeft className="h-7 w-7 text-accent-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono text-sm" data-testid={`text-tx-hash-${tx.txHash}`}>
                              {truncateHash(tx.txHash)}
                            </code>
                            <Badge 
                              variant={tx.status === 1 ? "default" : "destructive"}
                              data-testid={`badge-status-${tx.txHash}`}
                            >
                              {tx.status === 1 ? "Success" : "Failed"}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span data-testid={`text-from-${tx.txHash}`}>
                              From {truncateAddress(tx.fromAddress)}
                            </span>
                            <span>→</span>
                            <span data-testid={`text-to-${tx.txHash}`}>
                              {tx.toAddress ? truncateAddress(tx.toAddress) : "Contract Creation"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div>
                              <span className="text-muted-foreground">Value: </span>
                              <span className="font-semibold" data-testid={`text-value-${tx.txHash}`}>
                                {formatWei(tx.value)} {nativeToken}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Block: </span>
                              <span className="font-semibold" data-testid={`link-block-${tx.txHash}`}>
                                {tx.blockNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span data-testid={`text-time-${tx.txHash}`}>
                                {formatTimestamp(tx.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                Waiting for blockchain sync to begin
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
