import React, { useState, useEffect } from "react";
import {
  AlarmClockOff,
  Send,
  Ban,
  Wallet,
  Medal,
  ArrowLeft,
  User,
  Activity,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { FunnelBar } from "@/components/ui/FunnelBar";
import { HeatMap } from "@/components/dashboard/HeatMap";
import { LostLeadsFunnel } from "@/components/dashboard/LostLeadsFunnel";
import {
  PeriodFilter,
  type PeriodFilterData,
} from "@/components/ui/PeriodFilter";
import {
  getBrokerById,
  getBrokerPoints,
  getBrokerRankPosition,
  getBrokerLeads,
  getKommoConfig,
} from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { TrendingUp, Clock, BarChart3 } from "lucide-react";
import { useBranding } from "@/lib/brandingContext";
import { getServerBaseUrl } from "@/lib/utils";

// Add branding context usage
export function BrokerProfilePage() {
  const { id } = useParams() as { id: string };
  const brokerId = parseInt(id);
  const [, navigate] = useLocation();
  const { branding } = useBranding();
  const queryClient = useQueryClient();

  // Estados para filtros dos componentes
  const [metricsFilter, setMetricsFilter] = useState<PeriodFilterData>({
    filter_type: "current_month",
  });
  const [heatmapFilter, setHeatmapFilter] = useState<PeriodFilterData>({
    filter_type: "current_week",
  });
  const [salesFunnelFilter, setSalesFunnelFilter] = useState<PeriodFilterData>({
    filter_type: "current_month",
  });
  const [lostLeadsFilter, setLostLeadsFilter] = useState<PeriodFilterData>({
    filter_type: "current_month",
  });

  // Define types for your data if not already defined
  type Broker = Awaited<ReturnType<typeof getBrokerById>>;
  type BrokerPoints = Awaited<ReturnType<typeof getBrokerPoints>> & {
    vgv_mes?: number;
    tempo_primeira_interacao?: string;
    vendas_fechadas?: number;
    angariacoes?: number;
    taxa_conversao?: number;
  };
  type RankPosition = Awaited<ReturnType<typeof getBrokerRankPosition>>;
  type Lead = Awaited<ReturnType<typeof getBrokerLeads>>[number];
  type KommoConfig = Awaited<ReturnType<typeof getKommoConfig>>;

  type HeatmapData = {
    dias: string[];
    horarios: string[];
    mensagensRecebidas: number[][];
    mensagensEnviadas: number[][];
  };

  const { data: broker, error } = useQuery<Broker | null>({
    queryKey: ["broker", brokerId],
    queryFn: async () => {
      const res = await fetch(getServerBaseUrl() + `/api/brokers/${brokerId}`);

      if (res.status === 204) {
        return null;
      }

      if (!res.ok) {
        throw new Error("Erro ao buscar corretor");
      }

      return await res.json();
    },
    enabled: !!brokerId && !isNaN(brokerId),
  });

  useEffect(() => {
    if (
      broker === null ||
      error?.message === "Corretor inativo ou não encontrado"
    ) {
      navigate("/ranking");
    }
  }, [broker, error, navigate]);

  const { data: brokerPoints } = useQuery<BrokerPoints>({
    queryKey: ["brokerPoints", brokerId, metricsFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (metricsFilter.filter_type) {
        params.append("filterType", metricsFilter.filter_type);
      }
      if (metricsFilter.start_date) {
        params.append("startDate", metricsFilter.start_date);
      }
      if (metricsFilter.end_date) {
        params.append("endDate", metricsFilter.end_date);
      }
      // Add parameter to include all pipelines
      params.append("allPipelines", "true");

      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/points?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Erro ao buscar pontos do corretor");
      }
      return await res.json();
    },
    enabled: !!brokerId && !isNaN(brokerId),
  });

  const { data: rankPosition } = useQuery<RankPosition>({
    queryKey: ["brokerRankPosition", brokerId],
    queryFn: async () =>
      await import("@/lib/api").then((m) => m.getBrokerRankPosition(brokerId)),
    enabled: !!brokerId && !isNaN(brokerId),
  });

  const { data: leadsData } = useQuery<{
    tempo_medio_resposta: string;
    leads: Lead[];
    ticket_medio: number;
    vendas_fechadas: number;
    vgv_mes: number;
  }>({
    queryKey: ["brokerLeadsWithTicket", brokerId, metricsFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (metricsFilter.filter_type) {
        params.append("filterType", metricsFilter.filter_type);
      }
      if (metricsFilter.start_date) {
        params.append("startDate", metricsFilter.start_date);
      }
      if (metricsFilter.end_date) {
        params.append("endDate", metricsFilter.end_date);
      }
      // Add parameter to include all pipelines
      params.append("allPipelines", "true");

      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/leads-with-ticket?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Erro ao buscar leads do corretor");
      }
      return await res.json();
    },
    enabled: !!brokerId && !isNaN(brokerId),
  });

  const { data: pipelineConfig } = useQuery<{
    pipeline_id: number;
    company_id: string;
  }>({
    queryKey: ["pipelineConfig"],
    queryFn: async () => {
      const res = await fetch(
        getServerBaseUrl() + "/api/companies/pipeline-config",
      );
      if (!res.ok) throw new Error("Erro ao buscar configuração");
      return await res.json();
    },
    staleTime: 10 * 60 * 1000, // Cache por 10 minutos
  });

  const { data: etapasCount } = useQuery<Record<string, number>>({
    queryKey: ["brokerLeadsEtapasCount", brokerId, salesFunnelFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (salesFunnelFilter.filter_type) {
        params.append("filterType", salesFunnelFilter.filter_type);
      }
      if (salesFunnelFilter.start_date) {
        params.append("startDate", salesFunnelFilter.start_date);
      }
      if (salesFunnelFilter.end_date) {
        params.append("endDate", salesFunnelFilter.end_date);
      }
      // Add parameter to include all pipelines
      params.append("allPipelines", "true");

      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/etapas?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Erro ao buscar etapas do corretor");
      }
      return await res.json();
    },
    enabled: !!brokerId && !isNaN(brokerId),
  });

  const { data: heatMap } = useQuery<HeatmapData>({
    queryKey: ["brokerHeatmap", brokerId, heatmapFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (heatmapFilter.filter_type) {
        params.append("filterType", heatmapFilter.filter_type);
      }
      if (heatmapFilter.start_date) {
        params.append("startDate", heatmapFilter.start_date);
      }
      if (heatmapFilter.end_date) {
        params.append("endDate", heatmapFilter.end_date);
      }
      // Add parameter to include all pipelines
      params.append("allPipelines", "true");
      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/heatmap?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Erro ao buscar heatmap");
      }
      return await res.json();
    },
    enabled: !!brokerId && !isNaN(brokerId),
  });

  const {
    data: lostLeadsData,
    isLoading: isLoadingLostLeads,
    error: lostLeadsError,
  } = useQuery<{
    [stage: string]: { count: number; totalValue: number; color?: string };
  }>({
    queryKey: ["brokerLostLeads", brokerId, lostLeadsFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lostLeadsFilter.filter_type) {
        params.append("filterType", lostLeadsFilter.filter_type);
      }
      if (lostLeadsFilter.start_date) {
        params.append("startDate", lostLeadsFilter.start_date);
      }
      if (lostLeadsFilter.end_date) {
        params.append("endDate", lostLeadsFilter.end_date);
      }
      // Add parameter to include all pipelines
      params.append("allPipelines", "true");

      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/lost-leads?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Erro ao buscar leads perdidos");
      }
      return await res.json();
    },
    enabled: !!brokerId && !isNaN(brokerId),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 2,
  });

  const { data: weeklyPerformance, isLoading: isLoadingWeeklyPerformance } =
    useQuery({
      queryKey: ["brokerWeeklyPerformance", brokerId, metricsFilter],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (metricsFilter.filter_type) {
          params.append("filterType", metricsFilter.filter_type);
        }
        if (metricsFilter.start_date) {
          params.append("startDate", metricsFilter.start_date);
        }
        if (metricsFilter.end_date) {
          params.append("endDate", metricsFilter.end_date);
        }

        const res = await fetch(
          getServerBaseUrl() +
            `/api/brokers/${brokerId}/weekly-performance?${params.toString()}`,
        );
        if (!res.ok) {
          throw new Error("Erro ao buscar performance semanal");
        }
        return await res.json();
      },
      enabled: !!brokerId && !isNaN(brokerId),
    });

  const { data: inactivityData } = useQuery<{ inactivity_time: string }>({
    queryKey: ["brokerInactivityTime", brokerId],
    queryFn: async () =>
      await import("@/lib/api").then((m) =>
        m.getBrokerInactivityTime(brokerId),
      ),
    enabled: !!brokerId && !isNaN(brokerId),
    refetchInterval: 60000, // Atualizar a cada minuto
    staleTime: 30000, // Cache por 30 segundos
  });

  // Process stage analysis data - moved before early return
  const stageAnalysisData = etapasCount ? etapasCount : {};

  // Calculate totalLeads with React.useMemo to ensure proper initialization
  const totalLeads = React.useMemo(() => {
    if (!etapasCount) return 0;
    return Object.values(etapasCount).reduce(
      (sum: number, stage: any) => sum + (stage?.count || 0),
      0,
    );
  }, [etapasCount]);

  const wonLeads = React.useMemo(() => {
    return stageAnalysisData["Venda Ganha"]?.count || 0;
  }, [stageAnalysisData]);

  const overallConversionRate = React.useMemo(() => {
    return totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  }, [totalLeads, wonLeads]);

  // Ensure funnel data updates when etapasCount changes
  const funnelData = React.useMemo(() => {
    if (!etapasCount || Object.keys(etapasCount).length === 0) return [];

    return Object.entries(etapasCount).map(([stage, data]) => ({
      name: stage,
      value: totalLeads > 0 ? (data.count / totalLeads) * 100 : 0,
      count: data.count,
      totalValue: data.totalValue,
      isVendaGanha: stage.toLowerCase().includes("ganho"),
    }));
  }, [etapasCount, totalLeads]);

  // Process weekly performance data
  const weeklyPerformanceData = weeklyPerformance || {};

  // Determine if the screen is a TV screen based on resolution
  const isTVScreen =
    window.screen.width >= 1920 && window.screen.height >= 1080;

  // Loading state - moved after all hooks
  if (!broker || !brokerPoints || !leadsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div
              className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-purple-600 rounded-full animate-spin mx-auto"
              style={{ animationDelay: "0.3s" }}
            ></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">
              Carregando perfil
            </h3>
            <p className="text-gray-400">Buscando dados do corretor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/ranking")}
              className="group flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-gray-300 group-hover:text-white transition-colors">
                Voltar ao Ranking
              </span>
            </button>

            <div className="text-right">
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-lg font-mono text-blue-400">
                {new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Profile Header */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                {broker?.nome?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black text-sm font-bold shadow-lg">
                #{rankPosition}
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {broker?.nome}
              </h1>
              <p className="text-gray-400 text-lg mt-1">Corretor Imobiliário</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-300">
                    Posição #{rankPosition}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-300">
                    {totalLeads} leads totais
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Metrics */}
          <div className="xl:col-span-1 space-y-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Métricas de Performance
                  </h2>
                </div>
                <PeriodFilter
                  componentName="broker_performance_metrics"
                  onFilterChange={(filter) => {
                    setMetricsFilter(filter);
                    // Invalidate related queries immediately
                    queryClient.invalidateQueries({
                      queryKey: ["brokerPoints", brokerId],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["brokerLeadsWithTicket", brokerId],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["brokerWeeklyPerformance", brokerId],
                    });
                  }}
                  compact={true}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Wallet className="text-purple-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Ticket médio
                      </h3>
                      <p className="text-sm text-gray-500">por venda</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {(brokerPoints?.ticket_medio || 0) > 0
                      ? `R$ ${((brokerPoints?.ticket_medio || 0) / 1000).toFixed(0)}k`
                      : "R$ 0"}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="text-green-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        VGV Período
                      </h3>
                      <p className="text-sm text-gray-500">vendas do período</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {brokerPoints?.vgv_periodo
                      ? `R$ ${((brokerPoints?.vgv_periodo || 0) / 1000).toFixed(0)}k`
                      : "R$ 0"}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Clock className="text-blue-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Tempo médio
                      </h3>
                      <p className="text-sm text-gray-500">1ª interação</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {leadsData?.tempo_medio_resposta || "0h 0m"}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Ban className="text-red-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Oportunidades
                      </h3>
                      <p className="text-sm text-gray-500">perdidas</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {brokerPoints?.oportunidades_perdidas || 0}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Medal className="text-emerald-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Vendas
                      </h3>
                      <p className="text-sm text-gray-500">fechadas</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {brokerPoints?.vendas_fechadas || 0}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <BarChart3 className="text-cyan-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Taxa de
                      </h3>
                      <p className="text-sm text-gray-500">conversão período</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {brokerPoints?.taxa_conversao
                      ? `${brokerPoints.taxa_conversao.toFixed(1)}%`
                      : "0%"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    vendas ganhas / leads recebidos
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <User className="text-indigo-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Angariações
                      </h3>
                      <p className="text-sm text-gray-500">leads captados</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {brokerPoints?.total_leads || 0}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Send className="text-green-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Propostas
                      </h3>
                      <p className="text-sm text-gray-500">enviadas</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {brokerPoints?.propostas_enviadas || 0}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlarmClockOff className="text-red-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Tempo de
                      </h3>
                      <p className="text-sm text-gray-500">inatividade</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">
                    {inactivityData?.inactivity_time || "00:00:00"}
                  </p>
                </Card>
              </div>
            </div>
          </div>

          {/* Middle Column - Funnel Chart */}
          <div className="xl:col-span-1 space-y-6">
            {/* Funil de Vendas */}
            <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Funil de Vendas
                  </h2>
                </div>
                <PeriodFilter
                  componentName="sales_funnel"
                  onFilterChange={(filter) => {
                    setSalesFunnelFilter(filter);
                    // Invalidate related queries immediately
                    queryClient.invalidateQueries({
                      queryKey: ["brokerLeadsEtapasCount", brokerId],
                    });
                  }}
                  compact={true}
                />
              </div>
              <div>
                <FunnelBar totalLeads={totalLeads} stages={funnelData} />
              </div>
            </Card>

            {/* Funil de Leads Perdidos */}
            <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
              {isLoadingLostLeads ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <h3 className="text-xl font-semibold text-white">
                        Funil de Leads Perdidos
                      </h3>
                    </div>
                    <PeriodFilter
                      componentName="lost_leads_funnel"
                      onFilterChange={(filter) => {
                        setLostLeadsFilter(filter);
                        // Invalidate related queries immediately
                        queryClient.invalidateQueries({
                          queryKey: ["brokerLostLeads", brokerId],
                        });
                      }}
                      compact={true}
                    />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded mb-2 w-1/3"></div>
                        <div className="h-10 bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : lostLeadsError ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <h3 className="text-xl font-semibold text-white">
                        Funil de Leads Perdidos
                      </h3>
                    </div>
                    <PeriodFilter
                      componentName="lost_leads_funnel"
                      onFilterChange={(filter) => {
                        setLostLeadsFilter(filter);
                        // Invalidate related queries immediately
                        queryClient.invalidateQueries({
                          queryKey: ["brokerLostLeads", brokerId],
                        });
                      }}
                      compact={true}
                    />
                  </div>
                  <div className="text-center py-8">
                    <p className="text-red-400 mb-2">Erro ao carregar dados</p>
                    <p className="text-gray-500 text-sm">
                      {lostLeadsError?.message || "Tente novamente mais tarde"}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <h3 className="text-xl font-semibold text-white">
                        Funil de Leads Perdidos
                      </h3>
                    </div>
                    <PeriodFilter
                      componentName="lost_leads_funnel"
                      onFilterChange={(filter) => {
                        setLostLeadsFilter(filter);
                        // Invalidate related queries immediately
                        queryClient.invalidateQueries({
                          queryKey: ["brokerLostLeads", brokerId],
                        });
                      }}
                      compact={true}
                    />
                  </div>
                  <LostLeadsFunnel lostLeads={lostLeadsData || {}} />
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Activity Heatmap */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
              <div>
                {heatMap ? (
                  <HeatMap
                    dados={heatMap}
                    componentName="broker_heatmap"
                    onFilterChange={setHeatmapFilter}
                    showFilter={true}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Carregando mapa de atividade...
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
