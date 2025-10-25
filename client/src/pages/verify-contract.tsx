import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function VerifyContract() {
  const [address, setAddress] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [contractName, setContractName] = useState("");
  const [compilerVersion, setCompilerVersion] = useState("");
  const [optimization, setOptimization] = useState(false);
  const [optimizationRuns, setOptimizationRuns] = useState(200);
  const [constructorArgs, setConstructorArgs] = useState("");
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/verify-contract", {
        address,
        sourceCode,
        contractName,
        compilerVersion,
        optimization,
        optimizationRuns: optimization ? optimizationRuns : undefined,
        constructorArgs: constructorArgs || undefined,
      });
    },
    onSuccess: () => {
      setVerifiedAddress(address);
      toast({
        title: "Contract verified!",
        description: "Your contract has been successfully verified",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify contract. Please check your inputs.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !sourceCode || !contractName || !compilerVersion) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate();
  };

  if (verifiedAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
            <CardTitle className="text-2xl">Contract Verified Successfully!</CardTitle>
            <CardDescription>
              Your contract source code has been verified and is now publicly available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Contract Address</div>
              <code className="font-mono text-sm break-all">{verifiedAddress}</code>
            </div>
            <div className="flex gap-3">
              <Link href={`/address/${verifiedAddress}`}>
                <a className="flex-1">
                  <Button className="w-full" data-testid="button-view-contract">
                    View Contract
                  </Button>
                </a>
              </Link>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setVerifiedAddress(null);
                  setAddress("");
                  setSourceCode("");
                  setContractName("");
                  setCompilerVersion("");
                  setConstructorArgs("");
                }}
                data-testid="button-verify-another"
              >
                Verify Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <FileCode className="h-10 w-10 text-primary" />
          Verify & Publish Contract Source Code
        </h1>
        <p className="text-muted-foreground mt-2">
          Verify your smart contract source code for transparency and trust
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Free Contract Verification</div>
              <p className="text-sm text-muted-foreground">
                Verification is completely free. Your source code will be compiled and compared
                with the deployed bytecode for verification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
          <CardDescription>Enter your contract information for verification</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contract Address */}
            <div className="space-y-2">
              <Label htmlFor="address">
                Contract Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="input-address"
                required
              />
            </div>

            {/* Contract Name */}
            <div className="space-y-2">
              <Label htmlFor="contractName">
                Contract Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contractName"
                placeholder="e.g., MyToken"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                data-testid="input-contract-name"
                required
              />
            </div>

            {/* Compiler Version */}
            <div className="space-y-2">
              <Label htmlFor="compilerVersion">
                Compiler Version <span className="text-destructive">*</span>
              </Label>
              <Input
                id="compilerVersion"
                placeholder="e.g., v0.8.20+commit.a1b2c3d4"
                value={compilerVersion}
                onChange={(e) => setCompilerVersion(e.target.value)}
                data-testid="input-compiler-version"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the exact compiler version used to compile your contract
              </p>
            </div>

            {/* Optimization */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="optimization">Optimization Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable if you compiled with optimization
                  </p>
                </div>
                <Switch
                  id="optimization"
                  checked={optimization}
                  onCheckedChange={setOptimization}
                  data-testid="switch-optimization"
                />
              </div>

              {optimization && (
                <div className="space-y-2">
                  <Label htmlFor="optimizationRuns">Optimization Runs</Label>
                  <Input
                    id="optimizationRuns"
                    type="number"
                    placeholder="200"
                    value={optimizationRuns}
                    onChange={(e) => setOptimizationRuns(parseInt(e.target.value) || 200)}
                    data-testid="input-optimization-runs"
                  />
                </div>
              )}
            </div>

            {/* Constructor Arguments */}
            <div className="space-y-2">
              <Label htmlFor="constructorArgs">Constructor Arguments (Optional)</Label>
              <Textarea
                id="constructorArgs"
                placeholder="ABI-encoded constructor arguments (if any)"
                value={constructorArgs}
                onChange={(e) => setConstructorArgs(e.target.value)}
                className="font-mono text-sm"
                rows={3}
                data-testid="input-constructor-args"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if your contract has no constructor arguments
              </p>
            </div>

            {/* Source Code */}
            <div className="space-y-2">
              <Label htmlFor="sourceCode">
                Source Code <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="sourceCode"
                placeholder="Paste your Solidity source code here..."
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="font-mono text-sm"
                rows={15}
                data-testid="input-source-code"
                required
              />
              <p className="text-xs text-muted-foreground">
                Paste the complete Solidity source code, including all imports
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={verifyMutation.isPending}
              data-testid="button-verify-submit"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Verifying Contract...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Verify & Publish
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
