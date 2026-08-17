import { Loader2, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { inventoryUser } from "../layout/Header";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: any;
  onlyAdmin?: boolean;
  loading?: boolean
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  onClick,
  onlyAdmin,
  loading
}: StatsCardProps) {

  const [inventoryUser, setInventoryUser] = useState<inventoryUser>();
  useEffect(() => {
    const temUser = JSON.parse(
      localStorage.getItem("InventoryUser") || "null",
    );
    setInventoryUser(temUser);
  }, []);

  return onlyAdmin && inventoryUser?.role !== "admin" ? null : !loading ? (
    <Card onClick={onClick} className={cn("stat-card min-w-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="min-w-0 break-words text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="break-words text-xl font-bold sm:text-2xl">{value}</div>
        {(description || trend) && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center font-medium",
                  trend.isPositive ? "text-accent-600" : "text-destructive",
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card
      onClick={onClick}
      className={cn(
        "stat-card relative overflow-hidden transition-all duration-500",
        loading && "opacity-60 pointer-events-none",
        !loading && "opacity-100",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="min-w-0 break-words text-sm font-medium">{title}</CardTitle>
        <Loader2 className="animate-spin repeat-infinite opacity-25"/>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-7 w-24 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="break-words text-xl font-bold sm:text-2xl">{value}</div>

            {(description || trend) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {trend && (
                  <span
                    className={cn(
                      "inline-flex items-center font-medium",
                      trend.isPositive
                        ? "text-emerald-600"
                        : "text-destructive",
                    )}
                  >
                    {trend.isPositive ? "+" : ""}
                    {trend.value}
                  </span>
                )}

                {description && <span>{description}</span>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
