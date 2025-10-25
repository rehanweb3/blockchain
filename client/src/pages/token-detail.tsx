import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { 
  ArrowLeft, Copy, ExternalLink, CheckCircle2, Upload, 
  FileCode, Loader2, AlertCircle 
} from "lucide-react";
import { formatNumber, truncateHash, copyToClipboard } from "@/lib/utils";

interface TokenDetail {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  logoUrl?: string;
  logoStatus: string;
  creator?: string;
  contract?: {
    verified: boolean;
    abi?: string;
    sourceCode?: string;
    compilerVersion?: string;
    contractName?: string;
  };
}

interface ContractFunction {
  name: string;
  type: string;
  stateMutability: string;
  inputs: Array<{ name: string; type: string }>;
  outputs?: Array<{ name: string; type: string }>;
}

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

export default function TokenDetail() {
  const [, params] = useRoute("/token/:address");
  const address = params?.address;
  const { toast } = useToast();
  const { account } = useWallet();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: token, isLoading } = useQuery<TokenDetail>({
    queryKey: [`/api/address/${address}`],
    enabled: !!address,
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async () => {
      if (!logoFile || !account) throw new Error("Missing file or account");
      
      const formData = new FormData();
      formData.append("logo", logoFile);
      formData.append("tokenAddress", address!);
      formData.append("submittedBy", account);

      const response = await fetch("/api/token/submit-logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logo submitted!",
        description: "Your logo has been submitted for admin review",
      });
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: [`/api/address/${address}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
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

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Token Not Found</CardTitle>
            <CardDescription>The token you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/tokens">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tokens
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readFunctions = token.contract?.abi
    ? JSON.parse(token.contract.abi).filter(
        (fn: ContractFunction) => fn.type === "function" && (fn.stateMutability === "view" || fn.stateMutability === "pure")
      )
    : [];

  const writeFunctions = token.contract?.abi
    ? JSON.parse(token.contract.abi).filter(
        (fn: ContractFunction) => fn.type === "function" && fn.stateMutability !== "view" && fn.stateMutability !== "pure"
      )
    : [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tokens">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{token.name}</h1>
            <Badge variant="secondary">{token.symbol}</Badge>
            {token.contract?.verified && (
              <Badge className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Badge>
            )}
            {token.logoStatus === "approved" && (
              <Badge variant="outline" className="gap-1">
                ✓ Logo Approved
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">ERC-20 Token</p>
        </div>
      </div>

      {/* Token Details Card - Prominently displayed */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {token.logoUrl && token.logoStatus === "approved" ? (
                <img 
                  src={token.logoUrl} 
                  alt={`${token.name} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {token.symbol.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{token.name}</h2>
              <p className="text-lg text-muted-foreground">{token.symbol}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Supply</p>
              <p className="text-xl font-bold">
                {formatNumber(parseInt(token.totalSupply) / 10 ** token.decimals)} {token.symbol}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Contract Address</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {truncateHash(token.address)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopy(token.address, "Contract Address")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Creator Address</p>
              {token.creator ? (
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {truncateHash(token.creator)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(token.creator!, "Creator Address")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not available</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="flex flex-row gap-2 flex-wrap">
                {token.contract?.verified ? (
                  <Badge className="gap-1 w-fit">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="w-fit">Unverified</Badge>
                )}
                {token.logoStatus === "approved" && (
                  <Badge variant="outline" className="gap-1 w-fit">
                    ✓ Logo Approved
                  </Badge>
                )}
                {token.logoStatus === "pending" && (
                  <Badge variant="outline" className="gap-1 w-fit">
                    ⏳ Logo Pending Review
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {token.contract?.verified && (
            <>
              <TabsTrigger value="read">Read Contract</TabsTrigger>
              <TabsTrigger value="write">Write Contract</TabsTrigger>
            </>
          )}
          {!token.contract?.verified && (
            <TabsTrigger value="verify">Verify Contract</TabsTrigger>
          )}
          <TabsTrigger value="logo">Submit Logo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Decimals</p>
                  <p className="text-lg font-semibold mt-1">{token.decimals}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Supply</p>
              <p className="text-xl font-bold">
                {formatNumber(parseInt(token.totalSupply) / 10 ** token.decimals)} {token.symbol}
              </p>                </div>
              </div>
            </CardContent>
          </Card>

          {token.contract?.verified && token.contract.sourceCode && (
            <Card>
              <CardHeader>
                <CardTitle>Source Code</CardTitle>
                <CardDescription>Verified contract source code</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{token.contract.sourceCode}</code>
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {token.contract?.verified && (
          <TabsContent value="read" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Read Contract</CardTitle>
                <CardDescription>Query read-only functions</CardDescription>
              </CardHeader>
              <CardContent>
                <ReadContractFunctions
                  functions={readFunctions}
                  contractAddress={token.address}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {token.contract?.verified && (
          <TabsContent value="write" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Write Contract</CardTitle>
                <CardDescription>Execute state-changing functions</CardDescription>
              </CardHeader>
              <CardContent>
                {!account ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Connect your wallet to interact with this contract</p>
                  </div>
                ) : (
                  <WriteContractFunctions
                    functions={writeFunctions}
                    contractAddress={token.address}
                    abi={token.contract.abi!}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!token.contract?.verified && (
          <TabsContent value="verify" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Verify Contract</CardTitle>
                <CardDescription>
                  This contract is not verified. Visit the verification page to verify it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/verify-contract">
                  <Button>
                    <FileCode className="h-4 w-4 mr-2" />
                    Go to Verification Page
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="logo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Token Logo</CardTitle>
              <CardDescription>
                Upload a logo for your token. It will be reviewed by admins before appearing publicly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {token.logoStatus === "approved" ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500 mx-auto mb-4" />
                  <p className="font-medium">Logo Already Approved</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your token logo has been approved and is now visible
                  </p>
                </div>
              ) : token.logoStatus === "pending" ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                  <p className="font-medium">Logo Pending Review</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your logo submission is awaiting admin approval
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo-upload">Logo Image (PNG, JPG, SVG - Max 5MB)</Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      disabled={uploadLogoMutation.isPending || !account}
                    />
                  </div>

                  {!account && (
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet to submit a logo
                    </p>
                  )}

                  <Button
                    onClick={() => uploadLogoMutation.mutate()}
                    disabled={!logoFile || uploadLogoMutation.isPending || !account}
                  >
                    {uploadLogoMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Logo
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReadContractFunctions({ functions, contractAddress }: { functions: ContractFunction[]; contractAddress: string }) {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const callFunction = async (fn: ContractFunction, args: any[]) => {
    setLoading({ ...loading, [fn.name]: true });
    try {
      const response = await apiRequest("POST", `/api/contract/${contractAddress}/read`, {
        functionName: fn.name,
        args,
      });
      setResults({ ...results, [fn.name]: response.result });
    } catch (error: any) {
      toast({
        title: "Call failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading({ ...loading, [fn.name]: false });
    }
  };

  return (
    <div className="space-y-4">
      {functions.map((fn) => (
        <Card key={fn.name}>
          <CardHeader>
            <CardTitle className="text-base font-mono">{fn.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              size="sm"
              onClick={() => callFunction(fn, [])}
              disabled={loading[fn.name]}
            >
              {loading[fn.name] ? "Calling..." : "Query"}
            </Button>
            {results[fn.name] !== undefined && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Result:</p>
                <code className="text-sm">{JSON.stringify(results[fn.name])}</code>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WriteContractFunctions({ functions, contractAddress, abi }: { functions: ContractFunction[]; contractAddress: string; abi: string }) {
  const { toast } = useToast();
  const { account } = useWallet();

  const executeFunction = async (fn: ContractFunction) => {
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to interact with the contract",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Coming soon",
      description: "Write function execution will be available once MetaMask integration is complete",
    });
  };

  return (
    <div className="space-y-4">
      {functions.map((fn) => (
        <Card key={fn.name}>
          <CardHeader>
            <CardTitle className="text-base font-mono">{fn.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={() => executeFunction(fn)}>
              Execute
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
