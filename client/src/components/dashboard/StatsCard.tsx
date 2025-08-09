import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change: {
    value: string | number;
    isPositive: boolean;
  };
  suffix?: string;
  delay?: number;
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  suffix = "vs last month", 
  delay = 0,
  className
}: StatsCardProps) {
  return (
    <div 
      className={cn(
        "bg-card rounded-xl p-6 shadow-lg animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <h3 className="text-muted-foreground text-sm mb-2">{title}</h3>
      <p className="text-3xl font-mono font-bold text-foreground">{value}</p>
      <div className="flex items-center mt-2">
        <span 
          className={cn(
            "text-sm font-medium",
            change.isPositive ? "text-secondary" : "text-destructive"
          )}
        >
          {change.isPositive ? "+" : ""}{change.value}
        </span>
        <span className="text-muted-foreground text-xs ml-2">{suffix}</span>
      </div>
    </div>
  );
}
