import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function truncateHash(hash: string, startChars = 10, endChars = 8): string {
  if (!hash) return "";
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

export function formatTimestamp(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat().format(n);
}

export function formatWei(wei: string, decimals: number = 18): string {
  const value = BigInt(wei);
  const divisor = BigInt(10) ** BigInt(decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalString.replace(/0+$/, '').slice(0, 6);
  
  if (trimmedFractional) {
    return `${wholePart}.${trimmedFractional}`;
  }
  return wholePart.toString();
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
