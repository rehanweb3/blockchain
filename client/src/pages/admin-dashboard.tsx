import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Image, CheckCircle2, XCircle, LogOut, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatTimestamp, truncateAddress } from "@/lib/utils";
import type { Token } from "@shared/schema";
import { useEffect } from "react";

interface AdminStats {
  pendingLogos: number;
  approvedLogos: number;
  rejectedLogos: number;
  totalBlocks: number;
  totalTransactions: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLocation("/admin");
    }
  }, [setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: pendingLogos, isLoading: logosLoading } = useQuery<Token[]>({
    queryKey: ["/api/admin/review-logos"],
  });

  const approveMutation = useMutation({
    mutationFn: async (tokenAddress: string) => {
      return apiRequest("POST", `/api/admin/approve-logo/${tokenAddress}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-logos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Logo approved",
        description: "Token logo has been approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to approve",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (tokenAddress: string) => {
      return apiRequest("POST", `/api/admin/reject-logo/${tokenAddress}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-logos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Logo rejected",
        description: "Token logo has been rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reject",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    setLocation("/admin");
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage token logos and platform content
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Logos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-pending-logos">
                {stats?.pendingLogos || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                {stats?.approvedLogos || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600 dark:text-red-500">
                {stats?.rejectedLogos || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalBlocks?.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logo Review Section */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({stats?.pendingLogos || 0})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Pending Logo Reviews
              </CardTitle>
              <CardDescription>
                Review and approve or reject token logo submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logosLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : pendingLogos && pendingLogos.length > 0 ? (
                <div className="space-y-4">
                  {pendingLogos.map((token) => (
                    <Card key={token.address} data-testid={`pending-logo-${token.address}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          {token.logoUrl && (
                            <img
                              src={token.logoUrl}
                              alt={token.symbol}
                              className="h-16 w-16 rounded-full flex-shrink-0 border-2"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{token.symbol}</h3>
                              <Badge variant="secondary">{token.name}</Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Address:</span>{" "}
                                <code className="font-mono">{truncateAddress(token.address)}</code>
                              </div>
                              {token.submittedBy && (
                                <div>
                                  <span className="font-medium">Submitted by:</span>{" "}
                                  <code className="font-mono">{truncateAddress(token.submittedBy)}</code>
                                </div>
                              )}
                              {token.submittedAt && (
                                <div>
                                  <span className="font-medium">Submitted:</span>{" "}
                                  {formatTimestamp(Math.floor(new Date(token.submittedAt).getTime() / 1000))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => approveMutation.mutate(token.address)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-approve-${token.address}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => rejectMutation.mutate(token.address)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-reject-${token.address}`}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending reviews</h3>
                  <p className="text-muted-foreground">
                    All logo submissions have been reviewed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Logos</CardTitle>
              <CardDescription>Previously approved token logos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                View approved logos in the Tokens page
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Logos</CardTitle>
              <CardDescription>Previously rejected token logos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Rejected logo history
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
