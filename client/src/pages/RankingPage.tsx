import React, { useState, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { BrokerCard } from "@/components/dashboard/BrokerCard";
import { MetricSummaryCards } from "@/components/dashboard/MetricSummaryCards";
import { getBrokerRankings, getBrokerLeads } from "@/lib/api";
import {
  Medal,
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  Trophy,
  Settings,
} from "lucide-react";
import { useIsTVScreen, useScreenType } from "@/hooks/use-mobile";
import { MonthFilter, type MonthFilterData } from "@/components/ui/MonthFilter";
import { useBranding } from "@/lib/brandingContext";
import { useUnifiedFilter } from "@/lib/unifiedFilterContext";
import { useSaleAlerts } from "@/hooks/useSaleAlerts";
import { Toaster } from "@/components/ui/toaster";
import { TVSimulator } from "@/components/ui/TVSimulator";
import { TVIndicator } from "@/components/ui/TVIndicator";
import { getServerBaseUrl } from "@/lib/utils";

// Define the Broker type based on the expected API response
interface Broker {
  id: number;
  nome: string;
  pontos: number;
  leads_capturados: number;
  propostas_enviadas: number;
  leads_perdidos: number;
  vendas_realizadas: number;
  total_leads: number;
  leads_respondidos_1h?: number;
  leads_visitados?: number;
  leads_atualizados_mesmo_dia?: number;
  feedbacks_positivos?: number;
  resposta_rapida_3h?: number;
  todos_leads_respondidos?: number;
  cadastro_completo?: number;
  acompanhamento_pos_venda?: number;
  leads_sem_interacao_24h?: number;
  leads_ignorados_48h?: number;
  leads_respondidos_apos_18h?: number;
  leads_tempo_resposta_acima_12h?: number;
  leads_5_dias_sem_mudanca?: number;
  corretor_ocioso_mais_de_3h?: number;
  taxa_conversao?: number;
}

export function RankingPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [topBrokerIds, setTopBrokerIds] = useState<number[]>([]);
  const [resetProgress, setResetProgress] = useState(0);
  const isTVScreen = useIsTVScreen();
  const screenType = useScreenType();
  const currentDate = new Date();
  const [currentFilter, setCurrentFilter] = useState<MonthFilterData>({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });
  const { branding } = useBranding();
  const { setGlobalFilter } = useUnifiedFilter();

  // Sale alerts
  useSaleAlerts();

  type Lead = Awaited<ReturnType<typeof getBrokerLeads>>[number];

  const {
    data: brokers,
    isLoading: isLoadingBrokers,
    refetch: refetchBrokers,
  } = useQuery<Broker[]>({
    queryKey: ["brokerRankings", currentFilter.month, currentFilter.year],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (currentFilter.month && currentFilter.year) {
        params.append("month", currentFilter.month.toString());
        params.append("year", currentFilter.year.toString());
      }

      const url = `/api/brokers/rankings${params.toString() ? `?${params.toString()}` : ""}`;
      console.log("Fetching brokers rankings from:", url);

      const res = await fetch(getServerBaseUrl() + url);
      if (!res.ok) {
        throw new Error("Erro ao buscar corretores");
      }

      return await res.json();
    },
  });

  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["dashboardMetrics", currentFilter.month, currentFilter.year],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", currentFilter.month.toString());
      params.append("year", currentFilter.year.toString());

      const url = `/api/dashboard/metrics?${params.toString()}`;
      console.log("Fetching dashboard metrics from:", url);

      const res = await fetch(getServerBaseUrl() + url);
      if (!res.ok) {
        throw new Error("Erro ao buscar métricas do dashboard");
      }

      return await res.json();
    },
  });

  useEffect(() => {
    if (brokers && brokers.length >= 3) {
      setTopBrokerIds(brokers.slice(0, 3).map((broker: Broker) => broker.id));
    }
  }, [brokers]);

  const rotatePage = () => {
    setCurrentPage((prev) => (prev + 1) % (topBrokerIds.length + 1));
    setResetProgress((prev) => prev + 1);
  };

  const isLoading = isLoadingBrokers || isLoadingMetrics;

  const handleFilterChange = async (filter: MonthFilterData) => {
    setCurrentFilter(filter);
    
    // Convert MonthFilterData to UnifiedFilterData and set as global filter
    const unifiedFilter = {
      filter_type: "month",
      month: filter.month,
      year: filter.year,
    };
    
    await setGlobalFilter(unifiedFilter);
    // Data will be automatically refetched due to query key change
  };

  // Removed automatic refetch interval to prevent unnecessary API calls
  // Data will be refreshed when filter changes or manually by user

  return (
    <TVSimulator>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/5 to-orange-600/5"></div>
          <div className="relative px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {branding?.logo_url ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-xl">
                      <img
                        src={branding.logo_url}
                        alt="Company Logo"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-xl">
                      <Medal className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    🏆
                  </div>
                </div>

                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                    {branding?.dashboard_title || "Ranking de Corretores"}
                  </h1>
                  <p className="text-gray-400 text-xl mb-3">
                    {branding?.company_name_display ||
                      "Classificação baseada na produtividade"}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">Tempo Real</span>
                    </div>
                    {/* <a
                      href="/ranking/retrospective"
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                    >
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-medium">Retrospectiva</span>
                    </a> */}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-400">
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-lg font-mono text-yellow-400">
                  {new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Filtro de Mês */}
          <div className="mb-6 flex justify-end">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Filtrar por:</span>
              <MonthFilter
                componentName="ranking_metrics"
                onFilterChange={handleFilterChange}
                compact={true}
                className="max-w-md"
              />
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="mb-8">
            <MetricSummaryCards
              totalLeads={metrics?.totalLeads || 0}
              activeBrokers={metrics?.activeBrokers || 0}
              averagePoints={metrics?.maxPoints || 0}
              totalSales={metrics?.totalSales || 0}
              isLoading={isLoadingMetrics}
            />
          </div>

          {/* Brokers Grid */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-6">
              <Medal className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-semibold text-white">
                Classificação Geral
              </h2>
            </div>

            {isLoading ? (
              <div
                className={`grid auto-rows-fr ${
                  screenType === "mobile"
                    ? "grid-cols-2 gap-3 sm:grid-cols-3"
                    : screenType === "hd"
                      ? "grid-cols-4 gap-4 hd:grid-cols-5"
                      : screenType === "fhd"
                        ? "grid-cols-5 tv-gap fhd:grid-cols-6"
                        : screenType === "qhd"
                          ? "grid-cols-6 tv-gap-lg qhd:grid-cols-7"
                          : "grid-cols-7 tv-gap-lg uhd:grid-cols-8"
                }`}
              >
                {Array.from({
                  length:
                    screenType === "mobile"
                      ? 8
                      : screenType === "hd"
                        ? 12
                        : screenType === "fhd"
                          ? 15
                          : screenType === "qhd"
                            ? 18
                            : 24,
                }).map((_, i) => (
                  <div
                    key={i}
                    className={`bg-gray-800/50 animate-pulse rounded-xl border border-gray-700 ${
                      screenType === "mobile"
                        ? "h-56"
                        : screenType === "hd"
                          ? "h-64"
                          : screenType === "fhd"
                            ? "h-72"
                            : screenType === "qhd"
                              ? "h-80"
                              : "h-88"
                    }`}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
                        <div className="flex-1 h-4 bg-gray-700 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
                      </div>
                      <div className="pt-4 border-t border-gray-700">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`grid auto-rows-fr ${
                  screenType === "mobile"
                    ? "grid-cols-2 gap-3 sm:grid-cols-3"
                    : screenType === "hd"
                      ? "grid-cols-4 gap-4 hd:grid-cols-5"
                      : screenType === "fhd"
                        ? "grid-cols-5 tv-gap fhd:grid-cols-6"
                        : screenType === "qhd"
                          ? "grid-cols-6 tv-gap-lg qhd:grid-cols-7"
                          : "grid-cols-7 tv-gap-lg uhd:grid-cols-8"
                }`}
              >
                {brokers?.map((broker, index: number) => (
                  <div
                    key={broker.id}
                    className={
                      screenType === "mobile"
                        ? "min-h-[224px]"
                        : screenType === "hd"
                          ? "min-h-[256px]"
                          : screenType === "fhd"
                            ? "min-h-[288px]"
                            : screenType === "qhd"
                              ? "min-h-[320px]"
                              : "min-h-[352px]"
                    }
                  >
                    <BrokerCard
                      rank={index + 1}
                      broker={broker}
                      isTVScreen={isTVScreen}
                      totalLeadsLastMonth={broker.total_leads || 0}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  Última atualização: {new Date().toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Sistema em tempo real</span>
              </div>
            </div>
          </div>
        </div>
        <Toaster />
        <TVIndicator />
      </div>
    </TVSimulator>
  );
}
