import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Coins, Search } from "lucide-react";
import { truncateAddress, formatWei } from "@/lib/utils";
import { useState } from "react";
import type { Token } from "@shared/schema";

export default function Tokens() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tokens, isLoading } = useQuery<Token[]>({
    queryKey: ["/api/tokens"],
  });

  const filteredTokens = tokens?.filter((token) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Coins className="h-10 w-10 text-primary" />
          Tokens
        </h1>
        <p className="text-muted-foreground mt-2">
          Explore verified tokens on the blockchain
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-tokens"
            />
          </div>
        </CardContent>
      </Card>

      {/* Token List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tokens</CardTitle>
          <CardDescription>
            {filteredTokens?.length || 0} token{filteredTokens?.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredTokens && filteredTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTokens.map((token) => (
                <Link key={token.address} href={`/token/${token.address}`}>
                  <a>
                    <Card className="hover-elevate active-elevate-2 h-full" data-testid={`token-card-${token.symbol}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          {token.logoUrl && token.logoStatus === "approved" ? (
                            <img
                              src={token.logoUrl}
                              alt={token.symbol}
                              className="h-12 w-12 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Coins className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{token.symbol}</CardTitle>
                            <CardDescription className="truncate">{token.name}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Decimals</span>
                          <span className="font-semibold">{token.decimals}</span>
                        </div>
                        {token.totalSupply && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Supply</span>
                            <span className="font-semibold">{formatWei(token.totalSupply, token.decimals)}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <div className="text-xs text-muted-foreground mb-1">Contract Address</div>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate">
                            {token.address}
                          </code>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tokens found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search query" : "No verified tokens available yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
