import { Link } from "wouter";
import { Search, Menu, Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onSearch?: (query: string) => void;
  connectedWallet?: string | null;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
}

export function Header({ onSearch, connectedWallet, onConnectWallet, onDisconnectWallet }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/blocks", label: "Blocks" },
    { href: "/transactions", label: "Transactions" },
    { href: "/tokens", label: "Tokens" },
    { href: "/contracts", label: "Contracts" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 font-bold text-xl hover-elevate active-elevate-2 px-2 py-1 rounded-md cursor-pointer" data-testid="link-home">
            <div className="h-8 w-8 rounded-md flex items-center justify-center text-primary-foreground">
              <span className="text-lg font-bold"><img src="/images/MTT.png" alt="" /></span>
            </div>
            <span className="hidden sm:inline-block">Mintrax Explorer</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant="ghost" size="sm" data-testid={`link-${link.label.toLowerCase()}`}>
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Address / Txn Hash / Block"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4"
              data-testid="input-search"
            />
          </div>
        </form>

        {/* Wallet Connection */}
        <div className="hidden sm:flex items-center gap-2">
          {connectedWallet ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-wallet-connected">
                  <Wallet className="h-4 w-4 mr-2" />
                  {truncateAddress(connectedWallet)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Wallet</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDisconnectWallet} data-testid="button-disconnect-wallet">
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={onConnectWallet} data-testid="button-connect-wallet">
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col gap-2 mt-8">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`link-mobile-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="border-t my-4" />
              {connectedWallet ? (
                <>
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {truncateAddress(connectedWallet)}
                  </div>
                  <Button variant="ghost" className="w-full justify-start" onClick={onDisconnectWallet}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full" onClick={onConnectWallet}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
