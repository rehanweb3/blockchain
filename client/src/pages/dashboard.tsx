import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { truncateHash, truncateAddress, formatTimestamp, formatNumber, formatWei } from "@/lib/utils";
import { Clock, Box, ArrowRightLeft, Coins, Activity, Copy, CheckCircle2, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/utils";
import type { Block, Transaction } from "@shared/schema";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface DashboardStats {
  latestBlock: number;
  totalTransactions: number;
  totalAddresses: number;
  totalContracts: number;
  isConnected: boolean;
}

interface DailyTransactionStat {
  date: string;
  count: number;
  totalValue: string;
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: latestBlocks, isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks/latest"],
  });

  const { data: latestTransactions, isLoading: txnsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions/latest"],
  });

  const { data: dailyStats, isLoading: dailyStatsLoading } = useQuery<DailyTransactionStat[]>({
    queryKey: ["/api/transaction/daily-stats?days=7"],
  });

  const hasTransactionData = dailyStats && dailyStats.some(stat => stat.count > 0);

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

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Hero Section with Live Status */}
      <div className="relative rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 sm:p-8 md:p-12 border">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2 mb-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">Mintrax Explorer</h1>
            {stats?.isConnected && (
              <Badge variant="outline" className="gap-1.5 bg-background/80 self-start sm:self-auto">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </Badge>
            )}
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Track real-time blockchain data, verify smart contracts, and explore on-chain activity
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Latest Block</CardTitle>
            <Box className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6">
            {statsLoading ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-latest-block">
                {formatNumber(stats?.latestBlock || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Transactions</CardTitle>
            <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6">
            {statsLoading ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-transactions">
                {formatNumber(stats?.totalTransactions || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Addresses</CardTitle>
            <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6">
            {statsLoading ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-addresses">
                {formatNumber(stats?.totalAddresses || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Verified Contracts</CardTitle>
            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6">
            {statsLoading ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold" data-testid="text-total-contracts">
                {formatNumber(stats?.totalContracts || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Daily Transaction Count Chart */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Daily Transaction Count</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Number of transactions per day (Last 7 days)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {dailyStatsLoading ? (
              <Skeleton className="h-[250px] sm:h-[300px] w-full" />
            ) : hasTransactionData ? (
              <div className="w-full overflow-hidden">
                <ChartContainer
                  config={{
                    count: {
                      label: "Transactions",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[250px] sm:h-[300px] w-full min-w-0"
                >
                  <BarChart 
                    data={dailyStats}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No transaction data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Transaction Volume Chart */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Daily Transaction Volume</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Total value transferred per day (Last 7 days)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {dailyStatsLoading ? (
              <Skeleton className="h-[250px] sm:h-[300px] w-full" />
            ) : hasTransactionData ? (
              <div className="w-full overflow-hidden">
                <ChartContainer
                  config={{
                    totalValue: {
                      label: "Volume",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[250px] sm:h-[300px] w-full min-w-0"
                >
                  <AreaChart 
                    data={dailyStats.map(stat => ({
                      ...stat,
                      totalValue: Number(formatWei(stat.totalValue))
                    }))}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                      width={40}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalValue"
                      stroke="var(--color-totalValue)"
                      fill="var(--color-totalValue)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No transaction data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Blocks and Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Latest Blocks
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Most recent blocks on the chain</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {blocksLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-md flex-shrink-0" />
                    <Skeleton className="h-8 sm:h-10 flex-1 ml-3 sm:ml-4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {latestBlocks?.slice(0, 5).map((block) => (
                  <Link key={block.blockNumber} href={`/block/${block.blockNumber}`}>
                    <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover-elevate active-elevate-2 border cursor-pointer" data-testid={`block-${block.blockNumber}`}>
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-primary/10 flex items-center justify-center">
                        <Box className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm sm:text-base">{block.blockNumber}</span>
                          <Badge variant="secondary" className="text-xs">
                            {block.transactionCount} txns
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{formatTimestamp(block.timestamp)}</span>
                        </div>
                      </div>
                      <div className="hidden md:block text-right text-xs sm:text-sm flex-shrink-0">
                        <div className="text-muted-foreground">Miner</div>
                        <div className="font-mono">{truncateAddress(block.miner)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Transactions */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Latest Transactions
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Most recent transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {txnsLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 sm:h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {latestTransactions?.slice(0, 5).map((tx) => (
                  <Link key={tx.txHash} href={`/tx/${tx.txHash}`}>
                    <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover-elevate active-elevate-2 border cursor-pointer" data-testid={`tx-${tx.txHash}`}>
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-accent/10 flex items-center justify-center">
                        <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs sm:text-sm mb-1 truncate">{truncateHash(tx.txHash)}</div>
                        <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                          <span className="truncate">From {truncateAddress(tx.fromAddress)}</span>
                          <span className="flex-shrink-0">→</span>
                          <span className="truncate">{tx.toAddress ? truncateAddress(tx.toAddress) : "Contract Creation"}</span>
                        </div>
                      </div>
                      <div className="hidden md:block text-right flex-shrink-0">
                        <Badge variant={tx.status === 1 ? "default" : "destructive"} className="text-xs">
                          {tx.status === 1 ? "Success" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
