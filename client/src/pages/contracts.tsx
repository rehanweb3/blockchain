import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { FileCode, Search, CheckCircle2 } from "lucide-react";
import { truncateAddress, formatTimestamp } from "@/lib/utils";
import { useState } from "react";
import type { Contract } from "@shared/schema";

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const filteredContracts = contracts?.filter((contract) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contract.address.toLowerCase().includes(query) ||
      contract.contractName?.toLowerCase().includes(query) ||
      contract.creator.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <FileCode className="h-10 w-10 text-primary" />
          Verified Contracts
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse smart contracts with verified source code
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by address, name, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-contracts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contract List */}
      <Card>
        <CardHeader>
          <CardTitle>All Verified Contracts</CardTitle>
          <CardDescription>
            {filteredContracts?.length || 0} contract{filteredContracts?.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredContracts && filteredContracts.length > 0 ? (
            <div className="space-y-3">
              {filteredContracts.map((contract) => (
                <Link key={contract.address} href={`/address/${contract.address}`}>
                  <a>
                    <Card className="hover-elevate active-elevate-2" data-testid={`contract-${contract.address}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileCode className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-lg truncate">
                                  {contract.contractName || "Unnamed Contract"}
                                </CardTitle>
                                {contract.verified && (
                                  <Badge variant="default" className="flex-shrink-0">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <code className="text-sm font-mono text-muted-foreground">
                                {contract.address}
                              </code>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Creator</div>
                            <code className="text-sm font-mono">{truncateAddress(contract.creator)}</code>
                          </div>
                          {contract.compilerVersion && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Compiler</div>
                              <div className="text-sm font-mono">{contract.compilerVersion}</div>
                            </div>
                          )}
                          {contract.optimization !== null && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Optimization</div>
                              <div className="text-sm">
                                {contract.optimization
                                  ? `Enabled (${contract.optimizationRuns} runs)`
                                  : "Disabled"}
                              </div>
                            </div>
                          )}
                          {contract.verifiedAt && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Verified</div>
                              <div className="text-sm">
                                {formatTimestamp(Math.floor(new Date(contract.verifiedAt).getTime() / 1000))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search query" : "No verified contracts available yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
