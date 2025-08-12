import React from "react";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Target, DollarSign } from "lucide-react";

interface MetricSummaryCardsProps {
  totalLeads: number;
  activeBrokers: number;
  averagePoints: number;
  totalSales: number;
  isLoading: boolean;
}

export function MetricSummaryCards({
  totalLeads,
  activeBrokers,
  averagePoints,
  totalSales,
  isLoading,
}: MetricSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="p-4 bg-gray-800/50 backdrop-blur-sm border-gray-700"
          >
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-6 bg-gray-700 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const metrics = [
    {
      title: "Total de Leads",
      value: totalLeads.toLocaleString(),
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pontuação Máxima",
      value: averagePoints.toLocaleString(),
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Vendas Totais",
      value: formatCurrency(totalSales),
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const isTVScreen = window.innerWidth >= 1920;

  return (
    <div className={`grid grid-cols-4 gap-4 ${isTVScreen ? "tv-gap-lg" : ""}`}>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card
            key={index}
            className="p-4 bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:bg-gray-800/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-400 truncate">
                  {metric.title}
                </h3>
                <p className="text-xl font-bold text-white truncate">
                  {metric.value}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
