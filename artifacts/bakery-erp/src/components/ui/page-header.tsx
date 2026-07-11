import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8", className)} {...props}>
      <div>
        <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  className 
}: { 
  title: string; 
  value: React.ReactNode; 
  icon: any; 
  trend?: "up" | "down" | "neutral"; 
  trendValue?: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-muted-foreground font-medium">{title}</h3>
        <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-foreground font-serif tracking-tight">{value}</div>
        {trend && trendValue && (
          <div className={cn(
            "flex items-center text-sm font-medium",
            trend === "up" ? "text-green-600" : trend === "down" ? "text-destructive" : "text-muted-foreground"
          )}>
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}
