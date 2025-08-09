import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getServerBaseUrl = () => {
  if (import.meta.env.DEV) {
    // Em desenvolvimento, usar porta 3000 onde o servidor Express está rodando
    return window.location.protocol + "//" + window.location.hostname + ":3000";
  }
  // Em produção, usar a mesma origem
  return window.location.origin;
};

export function formatCurrency(amount: string | number): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (numAmount >= 1000000) {
    return `$${(numAmount / 1000000).toFixed(2)}M`;
  } else if (numAmount >= 1000) {
    return `$${(numAmount / 1000).toFixed(0)}K`;
  } else {
    return `$${numAmount.toFixed(2)}`;
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function getAbsoluteChange(current: number, previous: number): number {
  return current - previous;
}
