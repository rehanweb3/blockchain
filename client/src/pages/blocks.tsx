import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Box, Clock, ArrowRightLeft } from "lucide-react";
import { truncateAddress, formatTimestamp, formatNumber } from "@/lib/utils";
import type { Block } from "@shared/schema";

export default function Blocks() {
  const { data: blocks, isLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks/latest"],
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Box className="h-10 w-10 text-primary" />
          Latest Blocks
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse the most recent blocks on the blockchain
        </p>
      </div>

      {/* Blocks List */}
      <Card>
        <CardHeader>
          <CardTitle>All Blocks</CardTitle>
          <CardDescription>
            {blocks?.length || 0} most recent blocks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : blocks && blocks.length > 0 ? (
            <div className="space-y-3">
              {blocks.map((block) => (
                <Link key={block.blockNumber} href={`/block/${block.blockNumber}`}>
                  <Card className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`block-item-${block.blockNumber}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Box className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg" data-testid={`text-block-number-${block.blockNumber}`}>
                              Block #{formatNumber(block.blockNumber)}
                            </h3>
                            <Badge variant="secondary" data-testid={`badge-tx-count-${block.blockNumber}`}>
                              {block.transactionCount} txns
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span data-testid={`text-timestamp-${block.blockNumber}`}>
                                {formatTimestamp(block.timestamp)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Miner: </span>
                              <code className="font-mono text-xs" data-testid={`text-miner-${block.blockNumber}`}>
                                {truncateAddress(block.miner)}
                              </code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gas Used: </span>
                              <span className="font-semibold">{formatNumber(block.gasUsed)}</span>
                              <span className="text-muted-foreground ml-1">
                                / {formatNumber(block.gasLimit)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Size: </span>
                              <span className="font-semibold">{formatNumber(block.size)} bytes</span>
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
              <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No blocks found</h3>
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
