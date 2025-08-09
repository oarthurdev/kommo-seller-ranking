import React from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  className?: string;
}

export function MetricCard({ title, value, className = "" }: MetricCardProps) {
  return (
    <div className={`bg-card p-4 rounded-lg shadow border border-border ${className}`}>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-bold text-card-foreground">{value}</div>
    </div>
  );
}