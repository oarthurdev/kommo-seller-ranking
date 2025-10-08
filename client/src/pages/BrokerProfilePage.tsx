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
  TrendingUp,
  Clock,
  BarChart3,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
import { useBranding } from "@/lib/brandingContext";
import { useUnifiedFilter } from "@/lib/unifiedFilterContext";
import { getServerBaseUrl } from "@/lib/utils";

export function BrokerProfilePage() {
  const { id } = useParams() as { id: string };
  const brokerId = parseInt(id);
  const [, navigate] = useLocation();
  const { branding } = useBranding();
  const queryClient = useQueryClient();

  // Pega o globalFilter reativo
  const { currentFilter: globalFilter, isHydrated } = useUnifiedFilter();

  // Overrides locais (só existem quando o usuário mexe no filtro do componente)
  const [metricsFilterOverride, setMetricsFilterOverride] =
    useState<PeriodFilterData | null>(null);
  const [heatmapFilterOverride, setHeatmapFilterOverride] =
    useState<PeriodFilterData | null>(null);
  const [salesFunnelFilterOverride, setSalesFunnelFilterOverride] =
    useState<PeriodFilterData | null>(null);
  const [lostLeadsFilterOverride, setLostLeadsFilterOverride] =
    useState<PeriodFilterData | null>(null);

  // ---- Helpers de filtro ----
  type EffectiveFilter =
    | (PeriodFilterData & { month?: number; year?: number })
    | { filter_type: "month"; month: number; year: number };

  const resolveEffectiveFilter = (
    override: PeriodFilterData | null,
    globalF: {
      filter_type: string;
      month?: number;
      year?: number;
      start_date?: string;
      end_date?: string;
    },
  ): EffectiveFilter => {
    // Se o usuário escolheu manualmente um tipo diferente de "month", respeita o override
    if (override?.filter_type && override.filter_type !== "month") {
      return override as EffectiveFilter;
    }

    // Caso contrário, usa o globalFilter
    if (globalF.filter_type === "month") {
      return {
        filter_type: "month",
        month: globalF.month!,
        year: globalF.year!,
      };
    }
    // Global não é month (ex.: current_week, custom_range etc.)
    return {
      filter_type: globalF.filter_type,
      start_date: globalF.start_date,
      end_date: globalF.end_date,
    } as EffectiveFilter;
  };

  const buildParamsFromFilter = (f: EffectiveFilter) => {
    const params = new URLSearchParams();
    params.append("allPipelines", "true");

    if (f.filter_type) params.append("filterType", f.filter_type);

    if (f.filter_type === "month") {
      // carrega mês/ano do global
      if (typeof (f as any).month === "number")
        params.append("month", String((f as any).month));
      if (typeof (f as any).year === "number")
        params.append("year", String((f as any).year));
    } else {
      if ((f as any).start_date)
        params.append("startDate", (f as any).start_date);
      if ((f as any).end_date) params.append("endDate", (f as any).end_date);
    }

    return params;
  };

  // ---- Tipagens originais ----
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

  const { data: broker, error: brokerErr } = useQuery<Broker | null>({
    queryKey: ["broker", brokerId],
    queryFn: async () => {
      const res = await fetch(getServerBaseUrl() + `/api/brokers/${brokerId}`);
      if (res.status === 204) return null;
      if (!res.ok) throw new Error("Erro ao buscar corretor");
      return await res.json();
    },
    enabled: isHydrated && !!brokerId && !isNaN(brokerId),
  });

  useEffect(() => {
    if (
      broker === null ||
      brokerErr?.message === "Corretor inativo ou não encontrado"
    ) {
      navigate("/ranking");
    }
  }, [broker, brokerErr, navigate]);

  // --------- Métricas / Points ----------
  const effectiveMetricsFilter = resolveEffectiveFilter(
    metricsFilterOverride,
    globalFilter,
  );
  const { data: brokerPoints, error: pointsErr } = useQuery<BrokerPoints>({
    queryKey: ["brokerPoints", brokerId, effectiveMetricsFilter],
    queryFn: async () => {
      const params = buildParamsFromFilter(effectiveMetricsFilter);
      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/points?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar pontos do corretor");
      return await res.json();
    },
    enabled: isHydrated && !!brokerId && !isNaN(brokerId),
  });

  const { data: rankPosition } = useQuery<RankPosition>({
    queryKey: ["brokerRankPosition", brokerId],
    queryFn: async () =>
      await import("@/lib/api").then((m) => m.getBrokerRankPosition(brokerId)),
    enabled: isHydrated && !!brokerId && !isNaN(brokerId),
  });

  // --------- Leads com ticket ----------
  const effectiveLeadsFilter = effectiveMetricsFilter; // compartilha com métricas
  const { data: leadsData, error: leadsErr } = useQuery<{
    tempo_medio_resposta: string;
    leads: Lead[];
    ticket_medio: number;
    vendas_fechadas: number;
    vgv_mes: number;
  }>({
    queryKey: ["brokerLeadsWithTicket", brokerId, effectiveLeadsFilter],
    queryFn: async () => {
      const params = buildParamsFromFilter(effectiveLeadsFilter);
      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/leads-with-ticket?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar leads do corretor");
      return await res.json();
    },
    enabled: isHydrated && !!brokerId && !isNaN(brokerId),
  });

  // --------- Pipeline config ----------
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
    staleTime: 10 * 60 * 1000,
  });

  // --------- Etapas (funil de vendas) ----------
  const effectiveSalesFunnelFilter = resolveEffectiveFilter(
    salesFunnelFilterOverride,
    globalFilter,
  );
  const { data: etapasCount } = useQuery<
    Record<string, { count: number; totalValue: number }>
  >({
    queryKey: ["brokerLeadsEtapasCount", brokerId, effectiveSalesFunnelFilter],
    queryFn: async () => {
      const params = buildParamsFromFilter(effectiveSalesFunnelFilter);
      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/etapas?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar etapas do corretor");
      return await res.json();
    },
    enabled: isHydrated && !!brokerId && !isNaN(brokerId),
  });

  // --------- Heatmap ----------
  const effectiveHeatmapFilter = resolveEffectiveFilter(
    heatmapFilterOverride,
    globalFilter,
  );
  const { data: heatMap } = useQuery<HeatmapData>({
    queryKey: ["brokerHeatmap", brokerId, effectiveHeatmapFilter],
    queryFn: async () => {
      const params = buildParamsFromFilter(effectiveHeatmapFilter);
      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/heatmap?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar heatmap");
      return await res.json();
    },
    enabled: isHydrated && !!brokerId && !isNaN(brokerId),
  });

  // --------- Lost Leads ----------
  const effectiveLostLeadsFilter = resolveEffectiveFilter(
    lostLeadsFilterOverride,
    globalFilter,
  );
  const {
    data: lostLeadsData,
    isLoading: isLoadingLostLeads,
    error: lostLeadsError,
  } = useQuery<{
    [stage: string]: { count: number; totalValue: number; color?: string };
  }>({
    queryKey: ["brokerLostLeads", brokerId, effectiveLostLeadsFilter],
    queryFn: async () => {
      const params = buildParamsFromFilter(effectiveLostLeadsFilter);
      const res = await fetch(
        getServerBaseUrl() +
          `/api/brokers/${brokerId}/lost-leads?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar leads perdidos");
      return await res.json();
    },
    enabled: isHydrated && !!brokerId && !isNaN(brokerId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // --------- Weekly Performance ----------
  const effectiveWeeklyPerfFilter = effectiveMetricsFilter;
  const { data: weeklyPerformance, isLoading: isLoadingWeeklyPerformance } =
    useQuery({
      queryKey: [
        "brokerWeeklyPerformance",
        brokerId,
        effectiveWeeklyPerfFilter,
      ],
      queryFn: async () => {
        const params = buildParamsFromFilter(effectiveWeeklyPerfFilter);
        const res = await fetch(
          getServerBaseUrl() +
            `/api/brokers/${brokerId}/weekly-performance?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Erro ao buscar performance semanal");
        return await res.json();
      },
      enabled: isHydrated && !!brokerId && !isNaN(brokerId),
    });

  // --------- Inatividade (não depende de filtro) ----------
  const { data: inactivityData } = useQuery<{ inactivity_time: string }>({
    queryKey: ["brokerInactivityTime", brokerId],
    queryFn: async () =>
      await import("@/lib/api").then((m) =>
        m.getBrokerInactivityTime(brokerId),
      ),
    enabled: !!brokerId && !isNaN(brokerId),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // --------- Derivados UI ----------
  const stageAnalysisData = etapasCount ? etapasCount : {};
  const totalLeads = React.useMemo(() => {
    if (!etapasCount) return 0;
    return Object.values(etapasCount).reduce(
      (sum: number, stage: any) => sum + (stage?.count || 0),
      0,
    );
  }, [etapasCount]);

  const wonLeads = React.useMemo(
    () => stageAnalysisData["Venda Ganha"]?.count || 0,
    [stageAnalysisData],
  );

  const overallConversionRate = React.useMemo(
    () => (totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0),
    [totalLeads, wonLeads],
  );

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

  const weeklyPerformanceData = weeklyPerformance || {};
  const isTVScreen =
    window.screen.width >= 1920 && window.screen.height >= 1080;

  if (brokerErr || pointsErr || leadsErr) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Erro ao carregar dados do corretor. Tente mudar o período ou recarregar.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
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

      {/* Conteúdo */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Coluna Esquerda - Métricas */}
          <div className="xl:col-span-1 space-y-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Métricas de Performance
                  </h2>
                </div>
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
                    {brokerPoints?.vendas_realizadas &&
                    brokerPoints?.vendas_realizadas > 0 &&
                    (brokerPoints?.ticket_medio || 0) > 0
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
                    {leadsData?.vgv_mes
                      ? `R$ ${((leadsData?.vgv_mes || 0) / 1000).toFixed(0)}k`
                      : "R$ 0"}
                  </p>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Ban className="text-red-400 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">
                        Oportunidades perdidas
                      </h3>
                      <p className="text-sm text-gray-500">por inatividade</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {weeklyPerformanceData?.oportunidades_perdidas || 0}
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
                    {weeklyPerformanceData?.vendas_fechadas || 0}
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
                    {brokerPoints?.vendas_realizadas && brokerPoints?.vendas_realizadas > 0 && brokerPoints?.taxa_conversao
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
                        Leads
                      </h3>
                      <p className="text-sm text-gray-500">recebidos</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {weeklyPerformanceData?.leads_captados || 0}
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
                    {weeklyPerformanceData?.propostas_enviadas || 0}
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

          {/* Coluna do meio - Funis */}
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
                  onFilterChange={async (filter) => {
                    setSalesFunnelFilterOverride(filter);
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
              <div>
                <FunnelBar totalLeads={totalLeads} stages={funnelData} />
              </div>
            </Card>

            {/* Funil de Leads Perdidos */}
            <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
              {isLoadingLostLeads ? (
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-700 rounded w-20"></div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-700 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : lostLeadsError ? (
                <div className="text-center py-8">
                  <div className="text-red-400 mb-2">❌</div>
                  <p className="text-gray-400">
                    Erro ao carregar leads perdidos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {lostLeadsError.message}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Ban className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          Análise de Leads Perdidos
                        </h3>
                        <p className="text-sm text-gray-400">
                          Identificação de gargalos no funil de vendas
                        </p>
                      </div>
                    </div>
                    <PeriodFilter
                      componentName="lost_leads_funnel"
                      onFilterChange={async (filter) => {
                        setLostLeadsFilterOverride(filter);
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
                  <LostLeadsFunnel lostLeads={lostLeadsData || {}} />
                </div>
              )}
            </Card>
          </div>

          {/* Coluna direita - Heatmap */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
              <div>
                {heatMap ? (
                  <HeatMap
                    dados={heatMap}
                    componentName="broker_heatmap"
                    onFilterChange={async (filter) => {
                      setHeatmapFilterOverride(filter);
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
