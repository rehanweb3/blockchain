import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, ArrowRightLeft, CheckCircle2, XCircle, Clock, Fuel, FileCode } from "lucide-react";
import { truncateHash, truncateAddress, formatTimestamp, formatDate, formatNumber, formatWei, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Transaction } from "@shared/schema";

export default function TransactionDetail() {
  const [, params] = useRoute("/tx/:hash");
  const txHash = params?.hash;
  const { toast } = useToast();

  const { data: transaction, isLoading } = useQuery<Transaction>({
    queryKey: ["/api/tx", txHash],
    enabled: !!txHash,
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

  if (!transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Not Found</CardTitle>
            <CardDescription>The transaction you're looking for doesn't exist.</CardDescription>
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
  const totalFee = BigInt(transaction.gasUsed) * BigInt(transaction.gasPrice);

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
            <ArrowRightLeft className="h-8 w-8 text-primary" />
            Transaction Details
            <Badge variant={transaction.status === 1 ? "default" : "destructive"} className="text-base">
              {transaction.status === 1 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Success
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Failed
                </>
              )}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {formatTimestamp(transaction.timestamp)}
          </p>
        </div>
      </div>

      {/* Transaction Hash */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Hash</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded break-all" data-testid="text-tx-hash">
              {transaction.txHash}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => handleCopy(transaction.txHash, "Transaction hash")}
              data-testid="button-copy-hash"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Details */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <Badge variant={transaction.status === 1 ? "default" : "destructive"} data-testid="badge-status">
                  {transaction.status === 1 ? "Success" : "Failed"}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Block</div>
                <Link href={`/block/${transaction.blockNumber}`}>
                  <a className="font-semibold hover:text-primary" data-testid="link-block">
                    {formatNumber(transaction.blockNumber)}
                  </a>
                </Link>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Timestamp</div>
                <div className="font-semibold">{formatDate(transaction.timestamp)}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">From</div>
                <div className="flex items-center gap-2">
                  <Link href={`/address/${transaction.fromAddress}`}>
                    <a className="font-mono text-sm hover:text-primary break-all" data-testid="link-from">
                      {transaction.fromAddress}
                    </a>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleCopy(transaction.fromAddress, "From address")}
                    data-testid="button-copy-from"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">To</div>
                {transaction.toAddress ? (
                  <div className="flex items-center gap-2">
                    <Link href={`/address/${transaction.toAddress}`}>
                      <a className="font-mono text-sm hover:text-primary break-all" data-testid="link-to">
                        {transaction.toAddress}
                      </a>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleCopy(transaction.toAddress!, "To address")}
                      data-testid="button-copy-to"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : transaction.contractCreated ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Contract Creation</Badge>
                    <Link href={`/address/${transaction.contractCreated}`}>
                      <a className="font-mono text-sm hover:text-primary" data-testid="link-contract-created">
                        {truncateAddress(transaction.contractCreated)}
                      </a>
                    </Link>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Contract Creation</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Value</div>
                <div className="font-semibold text-lg" data-testid="text-value">
                  {formatWei(transaction.value)} {nativeToken}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Transaction Fee</div>
                <div className="font-semibold">{formatWei(totalFee.toString())} {nativeToken}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Gas Price</div>
                <div className="font-semibold">{formatWei(transaction.gasPrice, 9)} Gwei</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Gas Used</div>
                <div className="font-semibold flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  {formatNumber(transaction.gasUsed)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Nonce</div>
                <div className="font-semibold">{transaction.nonce}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Position in Block</div>
                <div className="font-semibold">{transaction.transactionIndex}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Additional Info */}
      <Tabs defaultValue="input" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input" data-testid="tab-input">Input Data</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Logs ({Array.isArray(transaction.logs) ? transaction.logs.length : 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="input">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Input Data
              </CardTitle>
              <CardDescription>Raw input data for this transaction</CardDescription>
            </CardHeader>
            <CardContent>
              {transaction.input && transaction.input !== "0x" ? (
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96">
                    <code>{transaction.input}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(transaction.input!, "Input data")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No input data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Event Logs</CardTitle>
              <CardDescription>Events emitted during transaction execution</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(transaction.logs) && transaction.logs.length > 0 ? (
                <div className="space-y-4">
                  {transaction.logs.map((log: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Log #{index}</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><span className="text-muted-foreground">Address:</span> <code className="font-mono text-xs">{log.address}</code></div>
                        {log.topics && log.topics.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Topics:</span>
                            <div className="ml-4 mt-1 space-y-1">
                              {log.topics.map((topic: string, i: number) => (
                                <div key={i} className="font-mono text-xs break-all">[{i}] {topic}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No event logs
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
