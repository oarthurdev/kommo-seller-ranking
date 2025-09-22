import { createClient } from "@supabase/supabase-js";

import dotenv from "dotenv";
dotenv.config();

// Import rate limiting
import { RateLimiter } from "limiter";
import { start } from "repl";

// Obter URL e chave anônima do Supabase das variáveis de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a rate limiter
const eventsRateLimiter = new RateLimiter({
  tokensPerInterval: 7, // 7 requests
  interval: "second", // per second
});

export async function getTotalLeadsBroker(brokerId: number, companyId: number) {
  const { count, error } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("responsavel_id", brokerId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Erro ao contar leads do corretor:", error);
    throw error;
  }

  return count ?? 0;
}

// Broker related queries
export async function getBrokerRankings(
  companyId: string,
  month?: number,
  year?: number,
) {
  try {
    // Buscar todos os corretores ativos da empresa
    const { data, error } = await supabase
      .from("brokers")
      .select("*")
      .eq("company_id", companyId)
      .eq("active", true)
      .eq("cargo", "Corretor");

    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Primeiro, obter o pipeline_id da configuração da empresa
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
      return [];
    }

    // Obter IDs dos pipelines disponíveis
    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      console.error("Nenhum pipeline disponível encontrado");
      return [];
    }

    // Calcular período do mês atual sempre para pontos
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Determinar período para contagem de leads
    let targetMonth, targetYear;

    // Se mês e ano foram fornecidos diretamente, usar eles
    if (month && year) {
      targetMonth = month;
      targetYear = year;
    } else {
      // Buscar filtro para ranking metrics como fallback
      const rankingFilter = await getComponentFilter(
        companyId,
        "ranking_metrics",
      );

      if (
        rankingFilter?.filter_type === "month" &&
        rankingFilter?.month &&
        rankingFilter?.year
      ) {
        targetMonth = rankingFilter.month;
        targetYear = rankingFilter.year;
      } else {
        // Usar mês atual como fallback
        targetMonth = now.getMonth() + 1;
        targetYear = now.getFullYear();
      }
    }

    // Calcular período baseado no mês/ano alvo
    const periodStart = new Date(targetYear, targetMonth - 1, 1);
    const periodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    console.log(`Calculando rankings para ${targetMonth}/${targetYear}`);

    // Transform the data to flatten the broker information and add metrics based on lead creation month
    const rankingsResults = await Promise.all(
      data.map(async (item) => {
        // Calcular propostas baseado nas atividades do mês
        const propostasEnviadas = await getPropostasEnviadasNoMes(
          item.id,
          companyId,
          periodStart,
          periodEnd,
          availablePipelineIds,
        );

        // Get current points from broker_points table - SEMPRE do mês atual para pontos
        const { data: pointsData } = await supabase
          .from("broker_points")
          .select(
            "id, pontos, vendas_realizadas, leads_perdidos, leads_descartados, total_leads",
          )
          .eq("id", item.id)
          .eq("company_id", companyId)
          .gte("updated_at", currentMonthStart.toISOString())
          .lte("updated_at", currentMonthEnd.toISOString())
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Calcular taxa de conversão baseada nos leads que entraram no mês
        const taxaConversao =
          pointsData?.total_leads > 0
            ? (pointsData?.vendas_realizadas / pointsData?.total_leads) * 100
            : 0;

        return {
          id: item.id,
          nome: item.nome,
          email: item.email,
          telefone: item.telefone,
          cargo: item.cargo,
          active: item.active,
          company_id: item.company_id,
          kommo_id: item.kommo_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          pontos: pointsData?.pontos || 0,
          total_leads: pointsData?.total_leads,
          vendas_realizadas: pointsData?.vendas_realizadas,
          leads_perdidos: pointsData?.leads_perdidos,
          leads_descartados: pointsData?.leads_descartados,
          propostas_enviadas: propostasEnviadas,
          leads_capturados: pointsData?.total_leads,
          taxa_conversao: taxaConversao,
        };
      }),
    );

    // Filtrar resultados null (corretores com datas inválidas)
    let rankings = rankingsResults.filter((result) => result !== null);

    // Separar corretores por tipo de pontuação
    const brokersWithPositivePoints = rankings.filter(
      (broker) => broker.pontos > 0,
    );
    const brokersWithNegativePoints = rankings.filter(
      (broker) => broker.pontos < 0,
    );
    const brokersWithZeroPoints = rankings.filter(
      (broker) => broker.pontos === 0,
    );

    // Ordenar cada grupo
    brokersWithPositivePoints.sort((a, b) => b.pontos - a.pontos); // Positivos: maior para menor
    brokersWithNegativePoints.sort((a, b) => b.pontos - a.pontos); // Negativos: menos negativo para mais negativo
    brokersWithZeroPoints.sort(
      (a, b) => (b.total_leads || 0) - (a.total_leads || 0),
    ); // Zero: por leads capturados

    // Se nenhum corretor tiver pontos (todos têm 0), ordenar apenas por leads capturados
    if (
      brokersWithPositivePoints.length === 0 &&
      brokersWithNegativePoints.length === 0
    ) {
      rankings = brokersWithZeroPoints;
    } else {
      // Combinar: positivos, negativos, depois zeros
      rankings = [
        ...brokersWithPositivePoints,
        ...brokersWithNegativePoints,
        ...brokersWithZeroPoints,
      ];
    }

    return rankings;
  } catch (error) {
    console.error("Error in getBrokerRankings:", error);
    return [];
  }
}

// Nova função auxiliar para contar propostas enviadas no mês usando activities
async function getPropostasEnviadasNoMes(
  brokerId: number,
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  availablePipelineIds: number[],
): Promise<number> {
  try {
    // Buscar todas as etapas de proposta dos pipelines da empresa
    const { data: proposalStages } = await supabase
      .from("stages_list")
      .select("stage_id, stage_name")
      .eq("company_id", companyId)
      .in("pipeline_id", availablePipelineIds)
      .ilike("stage_name", "%proposta%");

    if (!proposalStages || proposalStages.length === 0) {
      return 0;
    }

    const proposalStageIds = proposalStages.map((stage) => stage.stage_id);

    // Buscar atividades de mudança de status para etapas de proposta no período
    const { data: activities } = await supabase
      .from("activities")
      .select("id, valor_novo")
      .eq("user_id", brokerId)
      .eq("company_id", companyId)
      .eq("tipo", "mudança_status")
      .gte("criado_em", periodStart.toISOString())
      .lte("criado_em", periodEnd.toISOString());

    if (!activities || activities.length === 0) {
      return 0;
    }

    let propostasCount = 0;

    // Analisar cada atividade para ver se moveu para etapa de proposta
    for (const activity of activities) {
      try {
        let valorNovo;
        if (typeof activity.valor_novo === "string") {
          valorNovo = JSON.parse(activity.valor_novo);
        } else {
          valorNovo = activity.valor_novo;
        }

        const leadStatus = valorNovo?.[0]?.lead_status;
        if (leadStatus && proposalStageIds.includes(leadStatus.id)) {
          propostasCount++;
        }
      } catch (parseError) {
        // Ignorar erros de parse
        continue;
      }
    }

    return propostasCount;
  } catch (error) {
    console.error("Erro ao contar propostas do mês:", error);
    return 0;
  }
}

export async function getBrokers(companyId: string | number) {
  const { data, error } = await supabase
    .from("brokers")
    .select("*")
    .eq("company_id", companyId)
    .eq("Cargo", "Corretor")
    .eq("active", true);

  if (error) {
    console.error(`Error fetching brokers for company ${companyId}:`, error);
    throw error;
  }

  return data || [];
}

export async function getBrokerById(id: number, companyId: number) {
  const { data, error } = await supabase
    .from("brokers")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .eq("company_id", companyId)
    .maybeSingle(); // Retorna null se não encontrar nenhum registro

  if (error) {
    console.error(`Error fetching broker with ID ${id}:`, error);
    throw error;
  }

  // Retorna apenas se encontrou algum registro
  if (!data) {
    return null;
  }

  return data;
}

export async function getBrokerRankPosition(id: number, companyId: number) {
  try {
    // Primeiro, vamos buscar todos os brokers ordenados por pontuação
    const { data, error } = await supabase
      .from("broker_points")
      .select("id, brokers!inner(active)")
      .order("pontos", { ascending: false })
      .eq("brokers.active", true)
      .eq("company_id", companyId);

    if (error) throw error;

    // Encontrar a posição do broker no array (posição no ranking)
    const position = data.findIndex((broker) => broker.id === id) + 1; // +1 porque o array começa em 0

    // Garantir que sempre retornamos um número (1 como padrão se não encontrar)
    return position > 0 ? position : 1;
  } catch (error) {
    console.error(
      `Error finding rank position for broker with ID ${id}:`,
      error,
    );
    // Em caso de erro, retornar 1 como posição padrão
    return 1;
  }
}

export async function getBrokerTotalLeadsLastMonth(
  brokerId: number,
  companyId: string,
) {
  try {
    // Primeiro, obter o pipeline_id da configuração da empresa
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
      return 0;
    }

    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      return 0;
    }

    // Calcular período do mês passado completo
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const { count, error } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("responsavel_id", brokerId)
      .eq("company_id", companyId)
      .in("pipeline_id", availablePipelineIds)
      .gte("criado_em", lastMonthStart.toISOString())
      .lte("criado_em", lastMonthEnd.toISOString());

    if (error) {
      console.error("Erro ao buscar total de leads do mês passado:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Erro ao buscar total de leads do mês passado:", error);
    return 0;
  }
}

export async function getBrokerPoints(
  brokerId: number,
  companyId: string,
  startDate?: string,
  endDate?: string,
  allPipelines: boolean = false,
) {
  let query = supabase
    .from("broker_points")
    .select("*")
    .eq("id", brokerId)
    .eq("company_id", companyId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Erro ao buscar pontos do corretor:", error);
    return null;
  }

  // If allPipelines is true, recalculate metrics considering all configured pipelines
  if (allPipelines && data) {
    try {
      const updatedMetrics = await calculateBrokerMetricsAllPipelines(
        brokerId,
        companyId,
        startDate,
        endDate,
      );

      return {
        ...data,
        ...updatedMetrics,
      };
    } catch (error) {
      console.error(
        "Erro ao calcular métricas para todos os pipelines:",
        error,
      );
      return data;
    }
  }

  return data;
}

// Função para calcular métricas do corretor considerando todos os pipelines
async function calculateBrokerMetricsAllPipelines(
  brokerId: number,
  companyId: string,
  startDate?: Date | string,
  endDate?: Date | string,
): Promise<any> {
  try {
    // Buscar configuração dos pipelines
    const { data: configData } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      return {};
    }

    // Usar as datas fornecidas ou calcular o período baseado no filtro
    let currentPeriodStart: Date, currentPeriodEnd: Date;

    if (startDate && endDate) {
      // Garantir que são objetos Date válidos
      currentPeriodStart =
        startDate instanceof Date ? startDate : new Date(startDate);
      currentPeriodEnd = endDate instanceof Date ? endDate : new Date(endDate);
    } else {
      // Buscar filtro para broker_performance_metrics como fallback
      const performanceFilter = await getComponentFilter(
        companyId,
        "broker_performance_metrics",
      );
      const period = getDateRange(
        performanceFilter?.filter_type || "current_month",
        performanceFilter?.start_date,
        performanceFilter?.end_date,
        performanceFilter?.month,
        performanceFilter?.year,
      );
      currentPeriodStart = period.start;
      currentPeriodEnd = period.end;
    }

    // Validar se as datas são válidas
    if (!isValidDate(currentPeriodStart) || !isValidDate(currentPeriodEnd)) {
      console.error(
        "Datas inválidas em calculateBrokerMetricsAllPipelines:",
        currentPeriodStart,
        currentPeriodEnd,
      );
      // Usar mês atual como fallback
      const now = new Date();
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentPeriodEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    // Query para buscar todos os leads do período
    const { data: allLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, status_id, pipeline_id, valor, criado_em")
      .eq("responsavel_id", brokerId)
      .eq("company_id", companyId)
      .in("pipeline_id", availablePipelineIds);

    if (leadsError) {
      console.error("Erro ao buscar leads do corretor:", leadsError);
      return {};
    }

    if (!allLeads || allLeads.length === 0) {
      return {
        vendas_fechadas: 0,
        oportunidades_perdidas: 0,
        vgv_periodo: 0,
        ticket_medio: 0,
        taxa_conversao: 0,
        total_leads: 0,
      };
    }

    // Calcular métricas
    const totalLeads = allLeads.length;
    const vendasFechadas = allLeads.filter((lead) => lead.status_id === 142);
    const leadsPermitidos = allLeads.filter((lead) => lead.status_id === 143);

    const vgvPeriodo = vendasFechadas.reduce((sum, lead) => {
      const valor =
        typeof lead.valor === "number"
          ? lead.valor
          : parseFloat(lead.valor?.toString() || "0") || 0;
      return sum + valor;
    }, 0);

    const ticketMedio =
      vendasFechadas.length > 0 ? vgvPeriodo / vendasFechadas.length : 0;
    const taxaConversao =
      totalLeads > 0 ? (vendasFechadas.length / totalLeads) * 100 : 0;

    return {
      vendas_fechadas: vendasFechadas.length,
      oportunidades_perdidas: leadsPermitidos.length,
      vgv_periodo: vgvPeriodo,
      ticket_medio: ticketMedio,
      taxa_conversao: parseFloat(taxaConversao.toFixed(2)),
      total_leads: totalLeads,
    };
  } catch (error) {
    console.error("Erro ao calcular métricas para todos os pipelines:", error);
    return {};
  }
}

// Função para calcular taxa de conversão correta
export async function calculateBrokerConversionRate(
  brokerId: number,
  companyId: string,
  startDate?: Date,
  endDate?: Date,
  pipelineId?: number,
): Promise<number> {
  try {
    // Usar as datas fornecidas ou calcular o mês atual como fallback
    let currentMonthStart: Date, currentMonthEnd: Date;

    if (startDate && endDate) {
      currentMonthStart = startDate;
      currentMonthEnd = endDate;
    } else {
      const now = new Date();
      currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    // Buscar configuração dos pipelines
    const { data: configData } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    const availablePipelineIds = getPipelineIds(configData);

    // Query para buscar leads - filtrar por pipeline específico ou todos os pipelines
    let leadsQuery = supabase
      .from("leads")
      .select("id, status_id, pipeline_id")
      .eq("responsavel_id", brokerId)
      .eq("company_id", companyId)
      .gte("criado_em", currentMonthStart.toISOString())
      .lte("criado_em", currentMonthEnd.toISOString());

    // Se um pipeline específico foi fornecido, filtrar por ele
    if (pipelineId) {
      leadsQuery = leadsQuery.eq("pipeline_id", pipelineId);
    } else if (availablePipelineIds.length > 0) {
      // Se não, filtrar pelos pipelines disponíveis
      leadsQuery = leadsQuery.in("pipeline_id", availablePipelineIds);
    }

    const { data: allLeads, error: allLeadsError } = await leadsQuery;

    if (allLeadsError) {
      console.error("Erro ao buscar leads do corretor:", allLeadsError);
      return 0;
    }

    if (!allLeads || allLeads.length === 0) {
      return 0;
    }

    // Contar leads ganhos (status_id = 142)
    const leadsGanhos = allLeads.filter(
      (lead) => lead.status_id === 142,
    ).length;
    const totalLeads = allLeads.length;

    // Calcular taxa de conversão
    const taxaConversao = totalLeads > 0 ? (leadsGanhos / totalLeads) * 100 : 0;

    return parseFloat(taxaConversao.toFixed(2));
  } catch (error) {
    console.error("Erro ao calcular taxa de conversão:", error);
    return 0;
  }
}

export async function getBrokerLeads(brokerId: number, companyId: string) {
  try {
    // Primeiro, obter o pipeline_id da configuração da empresa
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
      return [];
    }

    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      return [];
    }

    // Buscar filtro para sales_funnel (leads fazem parte do funil de vendas)
    const salesFilter = await getComponentFilter(companyId, "sales_funnel");
    const period = getDateRange(
      salesFilter?.filter_type || "current_month",
      salesFilter?.start_date,
      salesFilter?.end_date,
      salesFilter?.month,
      salesFilter?.year,
    );

    // Usar período do filtro
    const currentMonthStart = period.start;
    const currentMonthEnd = period.end;

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("responsavel_id", brokerId)
      .in("pipeline_id", availablePipelineIds)
      .eq("company_id", companyId)
      .gte("criado_em", currentMonthStart.toISOString())
      .lte("criado_em", currentMonthEnd.toISOString())
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao buscar leads do corretor:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Erro ao buscar leads do corretor:", error);
    return [];
  }
}

export async function getBrokerLeadsWithTicket(
  brokerId: number,
  companyId: string,
  startDate?: string,
  endDate?: string,
  allPipelines: boolean = false,
) {
  try {
    // Usar datas fornecidas ou buscar filtro salvo
    let period;
    if (startDate && endDate) {
      period = getDateRange("custom_range", startDate, endDate);
    } else {
      const salesFilter = await getComponentFilter(companyId, "sales_funnel");
      period = getDateRange(
        salesFilter?.filter_type || "current_month",
        salesFilter?.start_date,
        salesFilter?.end_date,
        salesFilter?.month,
        salesFilter?.year,
      );
    }

    // Usar período do filtro
    const currentMonthStart = period.start;
    const currentMonthEnd = period.end;

    // Para ticket médio, sempre usar semana atual independente do filtro
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Domingo
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sábado
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Buscar configuração dos pipelines
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
      return {
        leads: [],
        ticket_medio: 0,
        vendas_fechadas: 0,
        vgv_mes: 0,
        tempo_medio_resposta: "00:00:00",
      };
    }

    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      return {
        leads: [],
        ticket_medio: 0,
        vendas_fechadas: 0,
        vgv_mes: 0,
        tempo_medio_resposta: "00:00:00",
      };
    }

    // Buscar os leads do corretor do período
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .eq("responsavel_id", brokerId)
      .eq("company_id", companyId)
      .in("pipeline_id", availablePipelineIds)
      .gte("criado_em", currentMonthStart.toISOString())
      .lte("criado_em", currentMonthEnd.toISOString());

    if (leadsError) {
      console.error("Erro ao buscar leads:", leadsError);
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      return {
        leads: [],
        ticket_medio: 0,
        vendas_fechadas: 0,
        vgv_mes: 0,
        tempo_medio_resposta: "00:00:00",
      };
    }

    // Filtrar vendas fechadas (status_id = 142) do mês atual para VGV
    const vendasFechadasMes = leads.filter((lead) => lead.status_id === 142);

    // Filtrar vendas fechadas da semana atual para ticket médio
    const vendasFechadasSemana = vendasFechadasMes.filter((lead) => {
      const leadDate = new Date(lead.criado_em);
      return leadDate >= currentWeekStart && leadDate <= currentWeekEnd;
    });

    // Calcular ticket médio das vendas fechadas da semana atual
    const ticketMedio =
      vendasFechadasSemana.length > 0
        ? vendasFechadasSemana.reduce((sum, lead) => {
            const valor =
              typeof lead.valor === "number"
                ? lead.valor
                : parseFloat(lead.valor?.toString() || "0") || 0;
            return sum + valor;
          }, 0) / vendasFechadasSemana.length
        : 0;

    // Calcular VGV total das vendas fechadas do mês atual
    const vgvMes = vendasFechadasMes.reduce((sum, lead) => {
      const valor =
        typeof lead.valor === "number"
          ? lead.valor
          : parseFloat(lead.valor?.toString() || 0) || 0;
      return sum + valor;
    }, 0);

    // Buscar informações da API do Kommo para tempo de resposta
    const { data: kommoApiConfig, error: kommoApiError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("api_url, access_token")
      .eq("company_id", companyId)
      .single();

    if (
      kommoApiError ||
      !kommoApiConfig?.api_url ||
      !kommoApiConfig?.access_token
    ) {
      console.error(
        "Erro ao buscar configuração da API do Kommo:",
        kommoApiError,
      );
      return {
        leads,
        ticket_medio: ticketMedio,
        vendas_fechadas: vendasFechadasMes.length,
        vgv_mes: vgvMes,
        tempo_medio_resposta: "00:00:00",
      };
    }

    // Calcular tempo médio de primeira resposta usando API do Kommo
    const temposResposta = await Promise.all(
      leads.map(async (lead) => {
        const criadoEm = new Date(lead.criado_em);
        const criadoEmTimestamp = Math.floor(criadoEm.getTime() / 1000);

        try {
          // Buscar eventos do lead específico após sua criação
          const eventsUrl = `${kommoApiConfig.api_url}/events?filter[entity]=lead&filter[entity_id]=${lead.id}&filter[created_at][from]=${criadoEmTimestamp}&limit=50`;

          await eventsRateLimiter.removeTokens(1);

          const response = await fetch(eventsUrl, {
            headers: {
              Authorization: `Bearer ${kommoApiConfig.access_token}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          });

          if (!response.ok) {
            console.error(
              `Erro ao buscar eventos do lead ${lead.id}:`,
              response.status,
            );
            return null;
          }

          const eventsData = await response.json();
          const events = eventsData._embedded?.events || [];

          // Filtrar apenas eventos de resposta/interação (mensagens enviadas, calls, etc.)
          const responseEvents = events.filter(
            (event: any) =>
              event.type === "outgoing_chat_message" ||
              event.type === "outgoing_message" ||
              event.type === "outgoing_call" ||
              event.type === "lead_status_changed" ||
              event.type === "note_added",
          );

          if (responseEvents.length > 0) {
            // Pegar o primeiro evento de resposta
            const primeiroEvento = responseEvents.reduce(
              (earliest: any, current: any) =>
                current.created_at < earliest.created_at ? current : earliest,
            );

            const primeiraResposta = new Date(primeiroEvento.created_at * 1000);
            const diffMs = primeiraResposta.getTime() - criadoEm.getTime();

            // Verificar se a diferença é positiva e razoável (não mais que 30 dias)
            if (diffMs > 0 && diffMs < 30 * 24 * 60 * 60 * 1000) {
              return Math.floor(diffMs / 1000);
            }
          }
        } catch (error) {
          console.error(`Erro ao processar eventos do lead ${lead.id}:`, error);
        }

        return null;
      }),
    );

    const temposValidos = temposResposta.filter(
      (tempo) => tempo !== null && tempo > 0,
    );

    // Calcular média dos tempos de resposta
    let tempoMedioResposta = "00:00:00";
    if (temposValidos.length > 0) {
      const mediaSegundos = Math.floor(
        temposValidos.reduce((sum, tempo) => sum + tempo, 0) /
          temposValidos.length,
      );

      const horas = Math.floor(mediaSegundos / 3600);
      const minutos = Math.floor((mediaSegundos % 3600) / 60);
      const segundos = mediaSegundos % 60;

      tempoMedioResposta = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
    }

    return {
      leads,
      ticket_medio: ticketMedio,
      vendas_fechadas: vendasFechadasMes.length,
      vgv_mes: vgvMes,
      tempo_medio_resposta: tempoMedioResposta,
    };
  } catch (error) {
    console.error("Erro em getBrokerLeadsWithTicket:", error);
    throw error;
  }
}

export async function getBrokerLeadEtapaCounts(
  brokerId: number,
  companyId: string,
  startDate?: string,
  endDate?: string,
  allPipelines: boolean = false,
) {
  try {
    // Primeiro, obter o pipeline_id da configuração da empresa
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
      return {};
    }

    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      return {};
    }

    // Buscar filtro para sales_funnel (etapas fazem parte do funil de vendas)
    const salesFilter = await getComponentFilter(companyId, "sales_funnel");
    const period = getDateRange(
      salesFilter?.filter_type || "current_month",
      salesFilter?.start_date,
      salesFilter?.end_date,
      salesFilter?.month,
      salesFilter?.year,
    );

    // Usar período do filtro
    const currentMonthStart = period.start;
    const currentMonthEnd = period.end;

    // Query para buscar leads do mês atual
    const { data, error } = await supabase
      .from("leads")
      .select("etapa, valor, status_id")
      .eq("responsavel_id", brokerId)
      .in("pipeline_id", availablePipelineIds)
      .eq("company_id", companyId)
      .gte("criado_em", currentMonthStart.toISOString())
      .lte("criado_em", currentMonthEnd.toISOString());

    if (error) {
      console.error("Erro ao buscar contagem de etapas:", error);
      return {};
    }

    // Agrupar por etapa e calcular valores
    const etapaCounts: {
      [key: string]: { count: number; totalValue: number };
    } = {};

    data?.forEach((lead) => {
      let etapa = lead.etapa || "Sem etapa";

      if (
        (lead.status_id === 142 || lead.status_id === 143) &&
        etapa.includes("(")
      ) {
        etapa = etapa.replace(/\s*\(.*?\)\s*$/, "").trim(); // Remove pipeline entre parênteses no final
      }

      const valor = typeof lead.valor === "number" ? lead.valor : 0;

      if (!etapaCounts[etapa]) {
        etapaCounts[etapa] = { count: 0, totalValue: 0 };
      }

      etapaCounts[etapa].count++;

      // Só somar valor se for venda ganha (status_id = 142)
      if (lead.status_id === 142) {
        etapaCounts[etapa].totalValue += valor;
      }
    });

    return etapaCounts;
  } catch (error) {
    console.error("Erro ao buscar contagem de etapas:", error);
    return {};
  }
}

export async function getBrokerActivities(id: number, companyId: number) {
  // Calcular a última semana + semana atual
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", id)
    .eq("company_id", companyId)
    .gte("criado_em", oneWeekAgo.toISOString())
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(`Error fetching activities for broker with ID ${id}:`, error);
    throw error;
  }

  return data;
}

// Função para converter UTC para GMT-3 (horário de Brasília)
function convertToGMT3(utcDate: Date): Date {
  if (!utcDate || !(utcDate instanceof Date) || isNaN(utcDate.getTime())) {
    // Retorna data atual do Brasil se a entrada for inválida
    const now = new Date();
    return new Date(now.getTime() - (3 * 60 * 60 * 1000));
  }
  const gmt3Date = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
  return gmt3Date;
}

// Função para gerar heatmap de atividades
export async function getActivityHeatmap(
  brokerId: number,
  companyId: string,
  startDate?: string,
  endDate?: string,
  pipelineFilter?: number[], // Aceita um array de pipeline IDs
) {
  try {
    // Buscar configuração do Kommo
    const { data: config, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("api_url, access_token, pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !config?.api_url || !config?.access_token) {
      console.error("Erro ao buscar configuração do Kommo:", configError);
      return {
        dias: [],
        horarios: [],
        mensagensRecebidas: [],
        mensagensEnviadas: [],
        period_info: "Erro ao carregar configuração.",
      };
    }

    // Gerenciar pipelines disponíveis
    const availablePipelineIds = getPipelineIds(config);
    let pipelinesToQuery = availablePipelineIds;

    // Se um filtro de pipeline específico foi passado, usá-lo
    if (pipelineFilter && pipelineFilter.length > 0) {
      pipelinesToQuery = pipelineFilter;
    }

    // Obter informações dos pipelines disponíveis
    const pipelineInfo = getPipelinesInfo(config);
    const pipelineIdMap = new Map(pipelineInfo.map((p) => [p.id, p]));

    // Determinar o período de análise (ajustado para GMT-3)
    let periodStart: Date, periodEnd: Date;

    if (startDate && endDate) {
      // Validar e criar datas de forma mais robusta
      try {
        // Verificar se as datas são strings válidas no formato YYYY-MM-DD
        if (typeof startDate === 'string' && typeof endDate === 'string') {
          // Criar datas locais primeiro (assumindo que já estão em GMT-3)
          const startLocal = new Date(startDate + "T00:00:00");
          const endLocal = new Date(endDate + "T23:59:59");
          
          // Verificar se as datas são válidas
          if (isNaN(startLocal.getTime()) || isNaN(endLocal.getTime())) {
            throw new Error("Datas fornecidas são inválidas");
          }
          
          periodStart = startLocal;
          periodEnd = endLocal;
        } else {
          throw new Error("Datas devem ser strings no formato YYYY-MM-DD");
        }
      } catch (error) {
        console.error("Erro ao processar datas customizadas:", error);
        // Fallback para mês atual
        const now = new Date();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }
    } else {
      // Buscar filtro salvo para 'broker_heatmap'
      const heatmapFilter = await getComponentFilter(
        companyId,
        "broker_heatmap",
      );

      // Definir o período baseado no filtro selecionado
      let filterType = heatmapFilter?.filter_type || "current_month";
      let customStartDate = heatmapFilter?.start_date;
      let customEndDate = heatmapFilter?.end_date;
      let selectedMonth = heatmapFilter?.month;
      let selectedYear = heatmapFilter?.year;

      // Validar se o filtro tipo é um dos novos tipos
      const validDateRanges = ["7_days", "30_days", "current_week", "current_month", "last_month", "month", "custom_range"];
      if (!validDateRanges.includes(filterType)) {
        filterType = "current_month"; // Default para mês atual
      }

      // Usar função de data range padrão
      const period = getDateRange(
        filterType,
        customStartDate,
        customEndDate,
        selectedMonth,
        selectedYear,
      );

      // Verificar se o período retornado é válido
      if (isValidDate(period.start) && isValidDate(period.end)) {
        periodStart = period.start;
        periodEnd = period.end;
      } else {
        console.error("Período retornado por getDateRange é inválido:", period);
        // Fallback para mês atual
        const now = new Date();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }
    }

    // Validar se as datas do período são válidas
    if (!isValidDate(periodStart) || !isValidDate(periodEnd)) {
      console.error("Datas de período inválidas:", {
        periodStart: periodStart?.toString() || 'undefined',
        periodEnd: periodEnd?.toString() || 'undefined',
        originalStartDate: startDate,
        originalEndDate: endDate,
        filterType: filterType
      });
      
      // Usar mês atual como fallback
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log("Usando período fallback (mês atual):", {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      });
    }

    const periodInfo = `Período: ${periodStart.toLocaleDateString("pt-BR")} a ${periodEnd.toLocaleDateString("pt-BR")}`;
    console.log(
      `Gerando heatmap para corretor ${brokerId} (Pipelines: ${pipelinesToQuery.join(", ")}), ${periodInfo}`,
    );

    // Dias da semana (Segunda a Domingo)
    const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

    // Horários comerciais com intervalos de 30 minutos (8:00 às 18:00)
    const horarios = [
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
      "17:00", "17:30", "18:00",
    ];

    // Inicializar matrizes de dados com zeros - 7 dias x 19 horários
    const mensagensRecebidasData = Array(7).fill(0).map(() => Array(19).fill(0));
    const mensagensEnviadasData = Array(7).fill(0).map(() => Array(19).fill(0));

    // Função para obter o índice do dia (0=Segunda, 6=Domingo) considerando GMT-3
    const getDayIndex = (utcDate: Date) => {
      const brazilDate = convertToGMT3(utcDate);
      const day = brazilDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
      // Mapear para: 0=Segunda, 1=Terça, ..., 5=Sábado, 6=Domingo
      return day === 0 ? 6 : day - 1;
    };

    // Função para obter o índice do horário considerando GMT-3
    const getTimeIndex = (utcDate: Date) => {
      const brazilDate = convertToGMT3(utcDate);
      const hour = brazilDate.getHours();
      const minute = brazilDate.getMinutes();

      // Manhã: 8:00-12:00 (slots 0-8)
      if (hour >= 8 && hour < 12) {
        const baseIndex = (hour - 8) * 2; // 8h=0, 9h=2, 10h=4, 11h=6
        return baseIndex + (minute >= 30 ? 1 : 0);
      } else if (hour === 12 && minute === 0) {
        return 8; // 12:00
      }

      // Tarde: 13:30-18:00 (slots 9-18)
      if (hour === 13 && minute >= 30) {
        return 9; // 13:30
      } else if (hour > 13 && hour < 18) {
        const baseIndex = 9 + (hour - 14) * 2; // 14h=11, 15h=13, 16h=15, 17h=17
        return baseIndex + (minute >= 30 ? 1 : 0);
      } else if (hour === 18 && minute === 0) {
        return 18; // 18:00
      }

      return -1; // Fora do horário comercial ou não mapeado
    };

    // Buscar mensagens enviadas (from activities)
    const { data: sentActivities, error: sentError } = await supabase
      .from("activities")
      .select("criado_em, tipo, lead_id") // Incluir lead_id para validação posterior
      .eq("user_id", brokerId)
      .eq("company_id", companyId)
      .gte("criado_em", periodStart.toISOString())
      .lte("criado_em", periodEnd.toISOString());
      // .eq("tipo", "mensagem_enviada"); // Considerar outras atividades como mensagens

    if (sentError) {
      console.error("Erro ao buscar atividades de mensagens enviadas:", sentError);
    }

    // Buscar mensagens recebidas (from from_webhook)
    const { data: receivedActivities, error: receivedError } = await supabase
      .from("from_webhook")
      .select("inserted_at, lead_id") // Incluir lead_id para validação posterior
      .eq("broker_id", brokerId)
      .gte("inserted_at", periodStart.toISOString())
      .lte("inserted_at", periodEnd.toISOString());

    if (receivedError) {
      console.error("Erro ao buscar atividades de mensagens recebidas:", receivedError);
    }

    // Filtrar leads do corretor para validação
    const { data: brokerLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, pipeline_id")
      .eq("responsavel_id", brokerId)
      .eq("company_id", companyId)
      .in("pipeline_id", pipelinesToQuery);

    if (leadsError) {
      console.error("Erro ao buscar leads do corretor:", leadsError);
      return {
        dias: [],
        horarios: [],
        mensagensRecebidas: [],
        mensagensEnviadas: [],
        period_info: "Erro ao carregar leads do corretor.",
      };
    }

    const brokerLeadIds = new Set(brokerLeads?.map(lead => lead.id));

    // Sets para rastrear leads únicos que já foram contados em cada slot de tempo
    const leadsEnviadasContados = new Map<string, Set<number>>(); // key: "dia_hora", value: Set de lead_ids
    const leadsRecebidasContados = new Map<string, Set<number>>(); // key: "dia_hora", value: Set de lead_ids

    // Função para gerar chave única para dia/hora
    const getSlotKey = (dayIndex: number, timeIndex: number) => `${dayIndex}_${timeIndex}`;

    // Processar mensagens enviadas - contar apenas 1 por lead por slot de tempo
    sentActivities?.forEach((activity) => {
      if (!activity.criado_em) return; // Pular se não houver data

      // Validar se a mensagem foi enviada para um lead do corretor e dos pipelines corretos
      if (activity.lead_id && brokerLeadIds.has(activity.lead_id)) {
        const messageDate = new Date(activity.criado_em);
        const dayIndex = getDayIndex(messageDate);
        const timeIndex = getTimeIndex(messageDate);

        if (dayIndex >= 0 && dayIndex < 7 && timeIndex >= 0 && timeIndex < 19) {
          const slotKey = getSlotKey(dayIndex, timeIndex);
          
          if (!leadsEnviadasContados.has(slotKey)) {
            leadsEnviadasContados.set(slotKey, new Set());
          }
          
          const leadsNoSlot = leadsEnviadasContados.get(slotKey)!;
          
          // Só incrementar se este lead ainda não foi contado neste slot
          if (!leadsNoSlot.has(activity.lead_id)) {
            leadsNoSlot.add(activity.lead_id);
            mensagensEnviadasData[dayIndex][timeIndex]++;
          }
        }
      }
    });

    // Processar mensagens recebidas - contar apenas 1 por lead por slot de tempo
    receivedActivities?.forEach((activity) => {
      if (!activity.inserted_at) return; // Pular se não houver data

      // Validar se a mensagem foi recebida para um lead do corretor e dos pipelines corretos
      if (activity.lead_id && brokerLeadIds.has(activity.lead_id)) {
        const messageDate = new Date(activity.inserted_at);
        const dayIndex = getDayIndex(messageDate);
        const timeIndex = getTimeIndex(messageDate);

        if (dayIndex >= 0 && dayIndex < 7 && timeIndex >= 0 && timeIndex < 19) {
          const slotKey = getSlotKey(dayIndex, timeIndex);
          
          if (!leadsRecebidasContados.has(slotKey)) {
            leadsRecebidasContados.set(slotKey, new Set());
          }
          
          const leadsNoSlot = leadsRecebidasContados.get(slotKey)!;
          
          // Só incrementar se este lead ainda não foi contado neste slot
          if (!leadsNoSlot.has(activity.lead_id)) {
            leadsNoSlot.add(activity.lead_id);
            mensagensRecebidasData[dayIndex][timeIndex]++;
          }
        }
      }
    });

    return {
      dias: diasSemana,
      horarios,
      mensagensRecebidas: mensagensRecebidasData,
      mensagensEnviadas: mensagensEnviadasData,
      period_info: periodInfo,
      debug_info: {
        sentActivitiesCount: sentActivities?.length || 0,
        receivedActivitiesCount: receivedActivities?.length || 0,
        brokerLeadsCount: brokerLeadIds.size,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
    };
  } catch (error) {
    console.error("Erro ao gerar heatmap:", error);
    return {
      dias: [],
      horarios: [],
      mensagensRecebidas: [],
      mensagensEnviadas: [],
      period_info: "Erro ao gerar heatmap.",
    };
  }
}

// Função auxiliar para obter alertas do corretor
export async function getBrokerAlerts(brokerId: number, companyId: number) {
  try {
    // Obter os pontos do corretor
    const brokerPoints = await getBrokerPoints(brokerId, companyId.toString());

    if (!brokerPoints) {
      return [];
    }

    const alerts = [];

    // Verificar leads sem interação
    if (brokerPoints.leads_sem_interacao_24h > 0) {
      alerts.push({
        tipo: "warning",
        mensagem: "Leads sem interação há mais de 24h",
        quantidade: brokerPoints.leads_sem_interacao_24h,
      });
    }

    // Verificar leads perdidos
    if (brokerPoints.leads_perdidos > 0) {
      alerts.push({
        tipo: "critical",
        mensagem: "Leads perdidos",
        quantidade: brokerPoints.leads_perdidos,
      });
    }

    return alerts;
  } catch (error) {
    console.error(`Error generating alerts for broker ${brokerId}:`, error);
    throw error;
  }
}

// Função para verificar se um horário está dentro do horário comercial
function isBusinessHour(date: Date): boolean {
  const day = date.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Verificar se é dia útil (segunda a sexta)
  if (day < 1 || day > 5) {
    return false;
  }

  // Verificar se está dentro do horário comercial
  // Manhã: 8:00 - 12:00 (480 - 720 minutos)
  // Tarde: 13:30 - 18:00 (810 - 1080 minutos)
  const morningStart = 8 * 60; // 8:00 = 480 minutos
  const morningEnd = 12 * 60; // 12:00 = 720 minutos
  const afternoonStart = 13 * 60 + 30; // 13:30 = 810 minutos
  const afternoonEnd = 18 * 60; // 18:00 = 1080 minutos

  return (
    (timeInMinutes >= morningStart && timeInMinutes < morningEnd) ||
    (timeInMinutes >= afternoonStart && timeInMinutes < afternoonEnd)
  );
}

// Função simplificada para calcular tempo de inatividade em horário comercial
function calculateBusinessInactivity(
  lastActivity: Date,
  currentTime: Date,
): number {
  // Validar entrada
  if (
    !lastActivity ||
    !currentTime ||
    isNaN(lastActivity.getTime()) ||
    isNaN(currentTime.getTime())
  ) {
    return 0;
  }

  // Se o tempo atual é antes da última atividade, retornar 0
  if (currentTime.getTime() <= lastActivity.getTime()) {
    return 0;
  }

  // Se as datas são muito próximas (< 1 minuto), retornar diferença simples
  const diffMs = currentTime.getTime() - lastActivity.getTime();
  if (diffMs < 60000) {
    return Math.floor(diffMs / 60000);
  }

  // Se a diferença é maior que 7 dias, limitar para evitar cálculos excessivos
  const maxDiff = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms
  if (diffMs > maxDiff) {
    return 99 * 60; // Retornar máximo de 99 horas em minutos
  }

  // Para cálculos simples do mesmo dia em horário comercial
  if (
    lastActivity.toDateString() === currentTime.toDateString() &&
    isBusinessHour(lastActivity) &&
    isBusinessHour(currentTime)
  ) {
    return Math.floor(diffMs / (1000 * 60));
  }

  // Cálculo mais complexo entre diferentes dias/horários
  let totalMinutes = 0;
  let currentDate = new Date(lastActivity);

  // Limitar o loop para evitar travamentos
  let iterations = 0;
  const maxIterations = 500; // Reduzido para ser mais conservador

  while (currentDate < currentTime && iterations < maxIterations) {
    iterations++;

    const day = currentDate.getDay();
    const hour = currentDate.getHours();

    // Se não é dia útil, pular para próximo dia útil
    if (day === 0 || day === 6) {
      const daysToAdd = day === 0 ? 1 : 8 - day; // Segunda-feira
      currentDate.setDate(currentDate.getDate() + daysToAdd);
      currentDate.setHours(8, 0, 0, 0);
      continue;
    }

    // Se é dia útil
    if (hour < 8) {
      // Antes das 8h, ir para 8h
      currentDate.setHours(8, 0, 0, 0);
    } else if (hour >= 8 && hour < 12) {
      // Período manhã (8h-12h)
      const endOfMorning = new Date(currentDate);
      endOfMorning.setHours(12, 0, 0, 0);

      const endTime = currentTime < endOfMorning ? currentTime : endOfMorning;
      const minutesInPeriod = Math.max(
        0,
        Math.floor((endTime.getTime() - currentDate.getTime()) / 60000),
      );

      totalMinutes += minutesInPeriod;
      currentDate = new Date(endOfMorning);
    } else if (hour >= 12 && hour < 13.5) {
      // Almoço (12h-13h30), pular para 13h30
      currentDate.setHours(13, 30, 0, 0);
    } else if (hour >= 13.5 && hour < 18) {
      // Período tarde (13h30-18h)
      const endOfAfternoon = new Date(currentDate);
      endOfAfternoon.setHours(18, 0, 0, 0);

      const endTime =
        currentTime < endOfAfternoon ? currentTime : endOfAfternoon;
      const minutesInPeriod = Math.max(
        0,
        Math.floor((endTime.getTime() - currentDate.getTime()) / 60000),
      );

      totalMinutes += minutesInPeriod;
      currentDate = new Date(endOfAfternoon);
    } else {
      // Após 18h, ir para próximo dia às 8h
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }

    // Proteção adicional contra loops infinitos
    if (currentDate >= currentTime) {
      break;
    }
  }

  // Garantir que o resultado seja válido
  return Math.max(0, Math.min(totalMinutes, 99 * 60));
}

// Função para buscar tempo de inatividade do corretor
export async function getBrokerInactivityTime(
  brokerId: number,
  companyId: string,
) {
  try {
    // Buscar configuração do Kommo
    const { data: config, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("api_url, access_token")
      .eq("company_id", companyId)
      .single();

    if (configError || !config?.api_url || !config?.access_token) {
      console.error("Erro ao buscar configuração do Kommo:", configError);
      return "00:00:00";
    }

    // Fazer requisição para a API do Kommo com timeout
    const eventsUrl = `${config.api_url}/events?filter[created_by]=${brokerId}&limit=10`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      // Apply rate limiting before making request
      await eventsRateLimiter.removeTokens(1);

      // Fazer requisição para buscar dados
      const response = await fetch(eventsUrl, {
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          "Erro ao buscar eventos do Kommo:",
          response.status,
          response.statusText,
        );
        return "00:00:00";
      }

      const data = await response.json();

      // Verificar se existem eventos válidos
      if (
        !data?._embedded?.events ||
        !Array.isArray(data._embedded.events) ||
        data._embedded.events.length === 0
      ) {
        return "99:59:59"; // Sem atividade recente
      }

      // Pegar o evento mais recente válido
      const latestEvent = data._embedded.events[0];

      if (
        !latestEvent?.created_at ||
        typeof latestEvent.created_at !== "number"
      ) {
        console.error("Evento inválido encontrado:", latestEvent);
        return "00:00:00";
      }

      const lastActivityTime = new Date(latestEvent.created_at * 1000);
      const currentTime = new Date();

      // Validar se as datas são válidas
      if (isNaN(lastActivityTime.getTime()) || isNaN(currentTime.getTime())) {
        console.error("Datas inválidas:", lastActivityTime, currentTime);
        return "00:00:00";
      }

      // Se a última atividade é muito antiga (mais de 7 dias), retornar máximo
      const sevenDaysAgo = new Date(
        currentTime.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      if (lastActivityTime < sevenDaysAgo) {
        return "99:59:59";
      }

      // Se ambas as datas estão em horário comercial no mesmo dia
      if (
        isBusinessHour(lastActivityTime) &&
        isBusinessHour(currentTime) &&
        lastActivityTime.toDateString() === currentTime.toDateString()
      ) {
        const diffMs = currentTime.getTime() - lastActivityTime.getTime();
        const totalMinutes = Math.floor(diffMs / (1000 * 60));

        if (totalMinutes < 0) {
          return "00:00:00";
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const limitedHours = Math.min(Math.max(hours, 0), 99);
        const limitedMinutes = Math.min(Math.max(minutes, 0), 59);

        return `${String(limitedHours).padStart(2, "0")}:${String(limitedMinutes).padStart(2, "0")}:00`;
      }

      // Usar cálculo de horário comercial simplificado
      const businessMinutes = calculateBusinessInactivity(
        lastActivityTime,
        currentTime,
      );

      if (businessMinutes < 0) {
        return "00:00:00";
      }

      const hours = Math.floor(businessMinutes / 60);
      const minutes = businessMinutes % 60;

      const limitedHours = Math.min(Math.max(hours, 0), 99);
      const limitedMinutes = Math.min(Math.max(minutes, 0), 59);

      return `${String(limitedHours).padStart(2, "0")}:${String(limitedMinutes).padStart(2, "0")}:00`;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        console.error("Timeout ao buscar eventos do Kommo");
      } else {
        console.error("Erro na requisição do Kommo:", fetchError);
      }
      return "00:00:00";
    }
  } catch (error) {
    console.error("Erro ao calcular tempo de inatividade:", error);
    return "00:00:00";
  }
}

// Analytics related queries
export async function getBrokerPerformance(
  brokerId: number,
  companyId: number,
) {
  // Gerar dados de performance mensal baseados nas atividades
  try {
    // Obter as atividades e leads do corretor
    const activities = await getBrokerActivities(brokerId, companyId);
    const leadsResult = await getBrokerLeads(brokerId, companyId.toString());
    const leads = leadsResult;

    // Agrupar por mês e calcular métricas
    const monthlyData = generateMonthlyData(activities, leads);

    // Calcular tipos de propriedades
    const propertyTypes = calculatePropertyTypes(leads);

    return {
      monthlyData,
      propertyTypes,
    };
  } catch (error) {
    console.error(
      `Error generating performance data for broker ${brokerId}:`,
      error,
    );
    throw error;
  }
}

// Funções para obter métricas gerais do dashboard
export async function getTotalLeads(
  companyId: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    // Validar companyId
    if (!companyId) {
      console.error("companyId é obrigatório");
      return 0;
    }

    // Buscar apenas leads de corretores ativos com cargo "Corretor"
    let query = supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    // MUDANÇA PRINCIPAL: Sempre usar a data de criação dos leads (criado_em)
    // para contar quantos leads entraram no período, independente do status atual
    if (startDate && endDate) {
      // Validar se as datas são strings válidas
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          // Usar criado_em para filtrar leads que ENTRARAM no período
          query = query.gte("criado_em", startDate).lte("criado_em", endDate);
        } else {
          console.error("Datas inválidas fornecidas:", startDate, endDate);
        }
      } catch (dateError) {
        console.error("Erro ao processar datas:", dateError);
      }
    } else {
      // Se não há filtro de data, buscar do mês atual baseado em criado_em
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      query = query
        .gte("criado_em", currentMonthStart.toISOString())
        .lte("criado_em", currentMonthEnd.toISOString());
    }

    // Buscar apenas leads de corretores ativos
    const { data: activeBrokers } = await supabase
      .from("brokers")
      .select("id")
      .eq("company_id", companyId);

    if (activeBrokers && activeBrokers.length > 0) {
      const activeBrokerIds = activeBrokers.map((broker) => broker.id);
      query = query.in("responsavel_id", activeBrokerIds);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Erro ao buscar total de leads:", error);
      return 0;
    }

    console.log(`Total leads que entraram no período: ${count || 0}`);
    return count || 0;
  } catch (error) {
    console.error("Erro na função getTotalLeads:", error);
    return 0;
  }
}

export async function getActiveBrokers(companyId: String) {
  try {
    // Consultar corretores ativos e contar o resultado
    const { data, error } = await supabase
      .from("brokers")
      .select("id")
      .eq("cargo", "Corretor")
      .eq("active", true)
      .eq("company_id", companyId);

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error("Error fetching active brokers:", error);
    return 0;
  }
}

export async function getMaxPoints(
  companyId: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    let query = supabase
      .from("broker_points")
      .select("pontos")
      .eq("company_id", companyId);

    const { data, error } = await query
      .order("pontos", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error("Erro ao buscar pontuação máxima:", error);
      return 0;
    }

    return data.pontos || 0;
  } catch (error) {
    console.error("Erro na função getMaxPoints:", error);
    return 0;
  }
}

export async function getTotalSales(
  companyId: string,
  pipelineId?: number,
  startDate?: string,
  endDate?: string,
) {
  try {
    // Validar companyId
    if (!companyId) {
      console.error("companyId é obrigatório");
      return 0;
    }

    // Buscar configuração dos pipelines
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar configuração dos pipelines:", configError);
      return 0;
    }

    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      console.error("Nenhum pipeline disponível encontrado");
      return 0;
    }

    // Buscar vendas fechadas (status_id = 142)
    let query = supabase
      .from("leads")
      .select("valor")
      .eq("company_id", companyId)
      .eq("status_id", 142);

    // Filtrar por pipeline específico ou todos os disponíveis
    if (pipelineId && !isNaN(pipelineId)) {
      query = query.eq("pipeline_id", pipelineId);
    } else {
      query = query.in("pipeline_id", availablePipelineIds);
    }

    // Aplicar filtro de data se fornecido
    if (startDate && endDate) {
      // Validar se as datas são strings válidas
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          query = query.gte("criado_em", startDate).lte("criado_em", endDate);
        } else {
          console.error("Datas inválidas fornecidas:", startDate, endDate);
        }
      } catch (dateError) {
        console.error("Erro ao processar datas:", dateError);
      }
    }

    // Filtrar apenas vendas de corretores ativos
    const { data: activeBrokers } = await supabase
      .from("brokers")
      .select("id")
      .eq("company_id", companyId)
      .eq("active", true)
      .eq("cargo", "Corretor");

    if (activeBrokers && activeBrokers.length > 0) {
      const activeBrokerIds = activeBrokers.map((broker) => broker.id);
      query = query.in("responsavel_id", activeBrokerIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar vendas totais:", error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    // Calcular soma total das vendas
    const totalSales = data.reduce((sum, lead) => {
      let valor = 0;

      if (lead.valor !== null && lead.valor !== undefined) {
        if (typeof lead.valor === "number") {
          valor = lead.valor;
        } else if (typeof lead.valor === "string") {
          const parsed = parseFloat(lead.valor);
          valor = isNaN(parsed) ? 0 : parsed;
        }
      }

      return sum + valor;
    }, 0);

    return totalSales;
  } catch (error) {
    console.error("Erro na função getTotalSales:", error);
    return 0;
  }
}

// Função para obter todas as métricas do dashboard de uma só vez
export async function getDashboardMetrics(
  companyId: string,
  pipelineId?: number,
  startDate?: string,
  endDate?: string,
) {
  try {
    const [totalLeads, activeBrokers, maxPoints, totalSales] =
      await Promise.all([
        getTotalLeads(companyId, pipelineId, startDate, endDate),
        getActiveBrokers(companyId),
        getMaxPoints(companyId, startDate, endDate),
        getTotalSales(companyId, pipelineId, startDate, endDate),
      ]);

    return {
      totalLeads,
      activeBrokers,
      averagePoints: maxPoints, // Para compatibilidade
      maxPoints,
      totalSales,
    };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return {
      totalLeads: 0,
      activeBrokers: 0,
      averagePoints: 0,
      maxPoints: 0,
      totalSales: 0,
    };
  }
}

// Função para análise de leads por etapa no mês atual
export async function getLeadsByStageCurrentMonth(companyId: string) {
  try {
    // Buscar o pipeline_id da kommo_config
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
      return {
        stageAnalysis: {},
        totalLeads: 0,
        wonLeads: 0,
        overallConversionRate: 0,
      };
    }

    const pipelineId = configData.pipeline_id;

    // Calcular o mês atual em tempo real
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Buscar leads do mês atual
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("etapa, valor, status_id, criado_em")
      .eq("company_id", companyId)
      .eq("pipeline_id", pipelineId)
      .gte("criado_em", currentMonthStart.toISOString())
      .lte("criado_em", currentMonthEnd.toISOString());

    if (leadsError) {
      console.error("Erro ao buscar leads por etapa:", leadsError);
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      return {
        stageAnalysis: {},
        totalLeads: 0,
        wonLeads: 0,
        overallConversionRate: 0,
      };
    }

    // Agrupar leads por etapa
    const stageAnalysis: { [stage: string]: any } = {};
    let totalLeads = leads.length;
    let wonLeads = 0;

    leads.forEach((lead) => {
      const stage = lead.etapa || "Sem etapa";
      const value = typeof lead.valor === "number" ? lead.valor : 0;
      const isWon = lead.status_id === 142; // Status de venda ganha

      if (isWon) {
        wonLeads++;
      }

      if (!stageAnalysis[stage]) {
        stageAnalysis[stage] = {
          count: 0,
          totalValue: 0,
          avgValue: 0,
          conversionRate: 0,
        };
      }

      stageAnalysis[stage].count++;
      stageAnalysis[stage].totalValue += value;
    });

    // Calcular médias e taxas de conversão
    Object.keys(stageAnalysis).forEach((stage) => {
      const stageData = stageAnalysis[stage];
      stageData.avgValue =
        stageData.count > 0 ? stageData.totalValue / stageData.count : 0;
      stageData.conversionRate =
        totalLeads > 0 ? (stageData.count / totalLeads) * 100 : 0;
    });

    const overallConversionRate =
      totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    return {
      stageAnalysis,
      totalLeads,
      wonLeads,
      overallConversionRate,
    };
  } catch (error) {
    console.error("Erro ao analisar leads por etapa:", error);
    return {
      stageAnalysis: {},
      totalLeads: 0,
      wonLeads: 0,
      overallConversionRate: 0,
    };
  }
}

// Função para obter leads por etapa no último mês (mantida para compatibilidade)
export async function getLeadsByStageLastMonth(companyId: string) {
  return getLeadsByStageCurrentMonth(companyId);
}

// Cores distintas para cada etapa do funil de leads perdidos
const LOST_LEADS_STAGE_COLORS = [
  "#DC2626", // Red-600
  "#7C2D12", // Red-900
  "#EA580C", // Orange-600
  "#92400E", // Amber-800
  "#A21CAF", // Fuchsia-700
  "#701A75", // Purple-800
  "#BE185D", // Pink-700
  "#831843", // Pink-900
  "#B45309", // Amber-700
  "#78350F", // Amber-900
  "#EF4444", // Red-500
  "#F97316", // Orange-500
];

// Cache para armazenar resultados por 5 minutos
const lostLeadsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getLostLeadsByStage(
  companyId: string,
  brokerId?: string,
  startDate?: string,
  endDate?: string,
  allPipelines: boolean = false,
) {
  // Criar chave de cache
  const cacheKey = `${companyId}-${brokerId || "all"}-${startDate || ""}-${endDate || ""}-${allPipelines}`;
  const now = Date.now();

  // Verificar cache
  if (lostLeadsCache.has(cacheKey)) {
    const cached = lostLeadsCache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    lostLeadsCache.delete(cacheKey);
  }

  // Buscar filtro para lost_leads_funnel
  let lostLeadsFilter;
  let currentPeriodStartUTC: Date, currentPeriodEndUTC: Date;

  if (startDate && endDate) {
    // Garantir que são objetos Date válidos
    currentPeriodStartUTC =
      typeof startDate === "string" ? new Date(startDate) : startDate;
    currentPeriodEndUTC =
      typeof endDate === "string" ? new Date(endDate) : endDate;
  } else {
    lostLeadsFilter = await getComponentFilter(companyId, "lost_leads_funnel");
    const period = getDateRange(
      lostLeadsFilter?.filter_type || "current_month",
      lostLeadsFilter?.start_date,
      lostLeadsFilter?.end_date,
      lostLeadsFilter?.month,
      lostLeadsFilter?.year,
    );
    currentPeriodStartUTC = period.start;
    currentPeriodEndUTC = period.end;
  }

  try {
    // Buscar configuração do Kommo para API
    const { data: kommoConfig, error: kommoError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("api_url, access_token")
      .eq("company_id", companyId)
      .single();

    if (kommoError || !kommoConfig?.api_url || !kommoConfig?.access_token) {
      console.error("Erro ao buscar configuração do Kommo:", kommoError);
      return {};
    }

    // Buscar atividades diretamente da tabela activities
    let activitiesQuery = supabase
      .from("activities")
      .select("id, valor_novo, valor_anterior, criado_em, user_id, lead_id")
      .eq("company_id", companyId)
      .eq("tipo", "mudança_status")
      .gte("criado_em", currentPeriodStartUTC.toISOString())
      .lte("criado_em", currentPeriodEndUTC.toISOString());

    // Se um corretor específico foi fornecido, filtrar por ele
    if (brokerId) {
      activitiesQuery = activitiesQuery.eq("user_id", brokerId);
    }

    const { data: activities, error } = await activitiesQuery;

    if (error) {
      console.error("Erro ao buscar atividades:", error);
      return {};
    }

    console.log(
      `Encontradas ${activities?.length || 0} atividades de leads perdidos para o corretor ${brokerId}`,
    );

    // Mapear status anteriores únicos por pipeline
    const statusesPorPipeline = new Map<number, Set<number>>();
    const lostByPreviousStage: {
      [stage: string]: {
        count: number;
        totalValue: number;
        color: string;
        pipeline_id: number;
        status_id: number;
      };
    } = {};

    for (const activity of activities || []) {
      try {
        // Parse do valor_novo para verificar se é realmente status 143
        let valorNovo;
        if (typeof activity.valor_novo === "string") {
          valorNovo = JSON.parse(activity.valor_novo);
        } else {
          valorNovo = activity.valor_novo;
        }

        // Verificar se é uma mudança para status perdido (143)
        const leadStatusNovo = valorNovo?.[0]?.lead_status;
        if (!leadStatusNovo || leadStatusNovo.id !== 143) {
          continue;
        }

        const pipelineId = leadStatusNovo.pipeline_id;

        // Parse do valor_anterior para obter o status anterior
        let valorAnterior;
        if (activity.valor_anterior) {
          if (typeof activity.valor_anterior === "string") {
            valorAnterior = JSON.parse(activity.valor_anterior);
          } else {
            valorAnterior = activity.valor_anterior;
          }

          const leadStatusAnterior = valorAnterior?.[0]?.lead_status;
          if (
            leadStatusAnterior &&
            leadStatusAnterior.id &&
            leadStatusAnterior.id !== 143
          ) {
            const previousStatusId = leadStatusAnterior.id;

            // Mapear status por pipeline para buscar nomes depois
            if (!statusesPorPipeline.has(pipelineId)) {
              statusesPorPipeline.set(pipelineId, new Set());
            }
            statusesPorPipeline.get(pipelineId)!.add(previousStatusId);
          }
        }
      } catch (parseError) {
        console.error("Erro ao analisar atividade:", parseError, activity);
      }
    }

    // Buscar nomes dos status da API do Kommo
    const statusNamesMap = new Map<string, string>();

    for (const [pipelineId, statusIds] of statusesPorPipeline) {
      try {
        await eventsRateLimiter.removeTokens(1);

        const pipelineUrl = `${kommoConfig.api_url}/leads/pipelines/${pipelineId}`;
        const response = await fetch(pipelineUrl, {
          headers: {
            Authorization: `Bearer ${kommoConfig.access_token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        if (response.ok) {
          const pipelineData = await response.json();
          const statuses = pipelineData._embedded?.statuses || [];

          for (const status of statuses) {
            const statusKey = `${pipelineId}-${status.id}`;
            statusNamesMap.set(statusKey, status.name || `Status ${status.id}`);
          }
        }
      } catch (apiError) {
        console.error(`Erro ao buscar pipeline ${pipelineId}:`, apiError);
      }
    }

    // Processar atividades novamente para contar e agrupar por nome do status
    let colorIndex = 0;

    for (const activity of activities || []) {
      try {
        // Parse do valor_novo para verificar se é realmente status 143
        let valorNovo;
        if (typeof activity.valor_novo === "string") {
          valorNovo = JSON.parse(activity.valor_novo);
        } else {
          valorNovo = activity.valor_novo;
        }

        // Verificar se é uma mudança para status perdido (143)
        const leadStatusNovo = valorNovo?.[0]?.lead_status;
        if (!leadStatusNovo || leadStatusNovo.id !== 143) {
          continue;
        }

        const pipelineId = leadStatusNovo.pipeline_id;

        // Parse do valor_anterior para obter o status anterior
        let valorAnterior;
        if (activity.valor_anterior) {
          if (typeof activity.valor_anterior === "string") {
            valorAnterior = JSON.parse(activity.valor_anterior);
          } else {
            valorAnterior = activity.valor_anterior;
          }

          const leadStatusAnterior = valorAnterior?.[0]?.lead_status;
          if (
            leadStatusAnterior &&
            leadStatusAnterior.id &&
            leadStatusAnterior.id !== 143
          ) {
            const previousStatusId = leadStatusAnterior.id;
            const statusKey = `${pipelineId}-${previousStatusId}`;

            // Buscar nome do status ou usar fallback
            const statusName =
              statusNamesMap.get(statusKey) || `Status ${previousStatusId}`;
            const stageName = `${statusName}`;

            if (!lostByPreviousStage[stageName]) {
              // Usar cores distintas baseadas no índice
              const assignedColor =
                LOST_LEADS_STAGE_COLORS[
                  colorIndex % LOST_LEADS_STAGE_COLORS.length
                ];
              colorIndex++;

              lostByPreviousStage[stageName] = {
                count: 0,
                totalValue: 0,
                color: assignedColor,
                pipeline_id: pipelineId,
                status_id: previousStatusId,
              };
            }

            lostByPreviousStage[stageName].count++;

            console.log(
              `Lead perdido encontrado: ${stageName} (Status ID: ${previousStatusId})`,
            );
          }
        }
      } catch (parseError) {
        console.error("Erro ao analisar atividade:", parseError, activity);
      }
    }

    // Armazenar no cache
    lostLeadsCache.set(cacheKey, { data: lostByPreviousStage, timestamp: now });

    console.log(`Resultado final leads perdidos:`, lostByPreviousStage);
    return lostByPreviousStage;
  } catch (error) {
    console.error("Erro ao buscar leads perdidos por etapa anterior:", error);
    return {};
  }
}

// Função para buscar métricas de performance baseadas no período selecionado
// Função simplificada para buscar métricas de performance
export async function getBrokerWeeklyPerformanceMetrics(
  brokerId: number,
  companyId: string,
  filter?: any,
) {
  try {
    console.log(
      `Buscando métricas para corretor ${brokerId} na empresa ${companyId}`,
    );

    // Buscar configuração do Kommo
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar configuração do Kommo:", configError);
      return {
        leads_captados: 0,
        propostas_enviadas: 0,
        oportunidades_perdidas: 0,
        vendas_fechadas: 0,
      };
    }

    const availablePipelineIds = getPipelineIds(configData);

    if (availablePipelineIds.length === 0) {
      console.log("Nenhum pipeline disponível");
      return {
        leads_captados: 0,
        propostas_enviadas: 0,
        oportunidades_perdidas: 0,
        vendas_fechadas: 0,
      };
    }

    // Calcular período do filtro
    const period = getDateRange(
      filter?.filter_type || "current_month",
      filter?.start_date,
      filter?.end_date,
      filter?.month,
      filter?.year,
    );
    const currentPeriodStartUTC = period.start;
    const currentPeriodEndUTC = period.end;

    console.log(
      `Período: ${currentPeriodStartUTC.toISOString()} até ${currentPeriodEndUTC.toISOString()}`,
    );

    // 1. LEADS CAPTADOS - buscar leads criados no período
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("id, status_id")
      .eq("responsavel_id", brokerId)
      .eq("company_id", companyId)
      .in("pipeline_id", availablePipelineIds)
      .gte("criado_em", currentPeriodStartUTC.toISOString())
      .lte("criado_em", currentPeriodEndUTC.toISOString());

    if (leadsError) {
      console.error("Erro ao buscar leads:", leadsError);
    }

    const leads = leadsData || [];
    const leadsCapturados = leads.length;

    console.log(`Leads capturados: ${leadsCapturados}`);

    // 4. PROPOSTAS ENVIADAS - buscar leads com etapa que começa com "proposta"
    const { data: propostasData, error: propostasError } = await supabase
      .from("leads")
      .select("id, etapa")
      .eq("responsavel_id", brokerId)
      .eq("company_id", companyId)
      .in("pipeline_id", availablePipelineIds)
      .gte("criado_em", currentPeriodStartUTC.toISOString())
      .lte("criado_em", currentPeriodEndUTC.toISOString());

    if (propostasError) {
      console.error("Erro ao buscar propostas:", propostasError);
    }

    // Contar propostas que começam com "proposta" (maiúsculo ou minúsculo)
    const propostasEnviadas = (propostasData || []).filter((lead) => {
      const etapa = lead.etapa?.toLowerCase() || "";
      return etapa.startsWith("proposta");
    }).length;

    console.log(`Propostas enviadas (baseado em etapa): ${propostasEnviadas}`);

    const { data: brokerPoints, error: brokerPointsError } = await supabase
      .from("broker_points")
      .select("id, vendas_realizadas, leads_perdidos")
      .eq("id", brokerId)
      .eq("company_id", companyId)
      .single();

    return {
      leads_captados: leadsCapturados,
      propostas_enviadas: propostasEnviadas,
      oportunidades_perdidas: brokerPoints?.leads_perdidos,
      vendas_fechadas: brokerPoints?.vendas_realizadas,
    };
  } catch (error) {
    console.error("Erro ao buscar métricas de performance:", error);
    return {
      leads_captados: 0,
      propostas_enviadas: 0,
      oportunidades_perdidas: 0,
      vendas_fechadas: 0,
    };
  }
}

export async function getKommoConfig(companyId: string) {
  try {
    const { data, error } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error) {
      console.error(
        `Error fetching kommo config for company ${companyId}:`,
        error,
      );
      throw error;
    }

    return data;
  } catch (error) {
    console.error(
      `Error fetching kommo config for company ${companyId}:`,
      error,
    );
    return null;
  }
}

// Função para extrair informações dos pipelines da configuração
export function getPipelinesInfo(
  config: any,
): Array<{ id: number; name: string; color: string }> {
  if (!config || !config.pipeline_id) {
    return [];
  }

  try {
    let pipelineData = config.pipeline_id;

    // Se for string JSON, parsear primeiro
    if (typeof pipelineData === "string") {
      try {
        pipelineData = JSON.parse(pipelineData);
      } catch (e) {
        console.error("Erro ao parsear pipeline_id:", e);
        return [];
      }
    }

    // Se for um objeto com propriedade 'pipelines'
    if (
      pipelineData &&
      pipelineData.pipelines &&
      Array.isArray(pipelineData.pipelines)
    ) {
      return pipelineData
        .map((pipeline: any) => ({
          id: Number(pipeline.id),
          name: pipeline.name || `Pipeline ${pipeline.id}`,
          color: pipeline.color || "#6366F1",
        }))
        .filter((pipeline: any) => !isNaN(pipeline.id));
    }

    // Se for array direto de objetos pipeline
    if (Array.isArray(pipelineData)) {
      return pipelineData
        .map((pipeline: any) => ({
          id: Number(pipeline.id || pipeline),
          name: pipeline.name || `Pipeline ${pipeline.id || pipeline}`,
          color: pipeline.color || "#6366F1",
        }))
        .filter((pipeline: any) => !isNaN(pipeline.id));
    }

    // Se for um único pipeline (número)
    if (typeof pipelineData === "number") {
      return [
        {
          id: pipelineData,
          name: `Pipeline ${pipelineData}`,
          color: "#6366F1",
        },
      ];
    }

    return [];
  } catch (error) {
    console.error("Erro ao extrair informações dos pipelines:", error);
    return [];
  }
}

// Função para extrair apenas os IDs dos pipelines
export function getPipelineIds(config: any): number[] {
  if (!config || !config.pipeline_id) {
    return [];
  }

  try {
    let pipelineData = config.pipeline_id;

    // Se for string JSON, parsear primeiro
    if (typeof pipelineData === "string") {
      try {
        pipelineData = JSON.parse(pipelineData);
      } catch (e) {
        console.error("Erro ao parsear pipeline_id:", e);
        return [];
      }
    }

    // Se for um objeto com propriedade 'pipelines'
    if (
      pipelineData &&
      pipelineData.pipelines &&
      Array.isArray(pipelineData.pipelines)
    ) {
      const ids = pipelineData.pipelines
        .map((pipeline: any) => Number(pipeline.id))
        .filter((id: number) => !isNaN(id) && id > 0);
      return ids;
    }

    // Se for array direto de objetos pipeline
    if (Array.isArray(pipelineData)) {
      const ids = pipelineData
        .map((pipeline: any) => Number(pipeline.id || pipeline))
        .filter((id: number) => !isNaN(id) && id > 0);
      return ids;
    }

    // Se for um único pipeline (número)
    if (
      typeof pipelineData === "number" &&
      !isNaN(pipelineData) &&
      pipelineData > 0
    ) {
      return [pipelineData];
    }

    // Se for string que representa um número
    if (typeof pipelineData === "string") {
      const numericId = Number(pipelineData);
      if (!isNaN(numericId) && numericId > 0) {
        return [numericId];
      }
    }

    return [];
  } catch (error) {
    console.error("Erro ao extrair IDs dos pipelines:", error);
    return [];
  }
}

// Função para comparação mensal
export async function getMonthlyComparison(companyId: string) {
  try {
    // Buscar o pipeline_id da kommo_config
    const { data: configData, error: configError } = await supabase
      .schema("cf_kommo")
      .from("kommo_config")
      .select("pipeline_id")
      .eq("company_id", companyId)
      .single();

    if (configError || !configData?.pipeline_id) {
      console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
      return {
        currentMonth: { leads: 0, sales: 0, revenue: 0 },
        previousMonth: { leads: 0, sales: 0, revenue: 0 },
        growth: { leads: 0, sales: 0, revenue: 0 },
      };
    }

    const pipelineId = configData.pipeline_id;

    const now = new Date();

    // Mês atual
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Mês passado
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    // Buscar dados do mês atual
    const { data: currentData, error: currentError } = await supabase
      .from("leads")
      .select("valor, status_id")
      .eq("company_id", companyId)
      .eq("pipeline_id", pipelineId)
      .gte("criado_em", currentMonthStart.toISOString())
      .lte("criado_em", currentMonthEnd.toISOString());

    // Buscar dados do mês passado
    const { data: previousData, error: previousError } = await supabase
      .from("leads")
      .select("valor, status_id")
      .eq("company_id", companyId)
      .eq("pipeline_id", pipelineId)
      .gte("criado_em", lastMonthStart.toISOString())
      .lte("criado_em", lastMonthEnd.toISOString());

    if (currentError || previousError) {
      console.error(
        "Erro ao buscar dados para comparação:",
        currentError || previousError,
      );
      throw currentError || previousError;
    }

    // Calcular métricas do mês atual
    const currentMonth = {
      leads: currentData?.length || 0,
      sales: currentData?.filter((lead) => lead.status_id === 142).length || 0,
      revenue:
        currentData
          ?.filter((lead) => lead.status_id === 142)
          .reduce((sum, lead) => sum + (lead.valor || 0), 0) || 0,
    };

    // Calcular métricas do mês passado
    const previousMonth = {
      leads: previousData?.length || 0,
      sales: previousData?.filter((lead) => lead.status_id === 142).length || 0,
      revenue:
        previousData
          ?.filter((lead) => lead.status_id === 142)
          .reduce((sum, lead) => sum + (lead.valor || 0), 0) || 0,
    };

    // Calcular crescimento
    const growth = {
      leads:
        previousMonth.leads > 0
          ? ((currentMonth.leads - previousMonth.leads) / previousMonth.leads) *
            100
          : 0,
      sales:
        previousMonth.sales > 0
          ? ((currentMonth.sales - previousMonth.sales) / previousMonth.sales) *
            100
          : 0,
      revenue:
        previousMonth.revenue > 0
          ? ((currentMonth.revenue - previousMonth.revenue) /
              previousMonth.revenue) *
            100
          : 0,
    };

    return {
      currentMonth,
      previousMonth,
      growth,
    };
  } catch (error) {
    console.error("Erro ao comparar dados mensais:", error);
    return {
      currentMonth: { leads: 0, sales: 0, revenue: 0 },
      previousMonth: { leads: 0, sales: 0, revenue: 0 },
      growth: { leads: 0, sales: 0, revenue: 0 },
    };
  }
}

//// Função auxiliar para sincronizar mensagens do Kommo com o banco local
export async function syncKommoMessagesToDatabase(
  brokerId: number,
  companyId: number,
) {
  try {
    // Esta função seria implementada quando necessário
    console.log(
      `Sync Kommo messages for broker ${brokerId} in company ${companyId}`,
    );
    return [];
  } catch (error) {
    console.error(
      `Error syncing Kommo messages for broker ${brokerId}:`,
      error,
    );
    return [];
  }
}

// Funções para análise de dados
function generateMonthlyData(_activities: any[], _leads: any[]) {
  // Exemplo simplificado - em produção, você usaria datas reais dos dados
  return [
    { month: "Jan", salesAmount: 450000, propertiesSold: 2, points: 45 },
    { month: "Fev", salesAmount: 320000, propertiesSold: 1, points: 30 },
    { month: "Mar", salesAmount: 780000, propertiesSold: 3, points: 72 },
    { month: "Abr", salesAmount: 550000, propertiesSold: 2, points: 53 },
    { month: "Mai", salesAmount: 630000, propertiesSold: 2, points: 48 },
    { month: "Jun", salesAmount: 920000, propertiesSold: 4, points: 85 },
  ];
}

function calculatePropertyTypes(_leads: any[]) {
  // Exemplo simplificado - em produção, você extrairia estes dados dos leads
  return [
    { type: "Apartamento", percentage: 45, count: 9 },
    { type: "Casa", percentage: 30, count: 6 },
    { type: "Terreno", percentage: 15, count: 3 },
    { type: "Comercial", percentage: 10, count: 2 },
  ];
}

export async function getMonthlyRetrospective(
  companyId: string,
  year: number,
  month: number,
) {
  try {
    // Primeiro, verificar se já existe dados salvos para este período na tabela monthly_retrospectives
    const { data: savedData, error: savedError } = await supabase
      .from("monthly_retrospectives")
      .select("data")
      .eq("company_id", companyId)
      .eq("year", year)
      .eq("month", month)
      .single();

    if (savedData && !savedError) {
      console.log(
        `Dados encontrados na tabela monthly_retrospectives para ${month}/${year}`,
      );
      return savedData.data;
    }

    // Se não existir dados salvos, verificar se é período atual ou futuro
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Se for período futuro ou atual (ainda não fechado), não mostrar dados
    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      console.log(`Período ${month}/${year} é futuro ou atual, não disponível`);
      return null;
    }

    // Para períodos passados, tentar calcular em tempo real se não estiver salvo
    console.log(`Calculando dados em tempo real para ${month}/${year}`);
    const calculatedData = await calculateMonthlyRetrospective(
      companyId,
      year,
      month,
    );

    // Se conseguiu calcular, salvar automaticamente para futuras consultas
    if (calculatedData) {
      try {
        await supabase.from("monthly_retrospectives").insert({
          company_id: companyId,
          year: year,
          month: month,
          data: calculatedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        console.log(
          `Dados salvos automaticamente na tabela monthly_retrospectives para ${month}/${year}`,
        );
      } catch (saveError) {
        console.error("Erro ao salvar dados calculados:", saveError);
        // Continuar mesmo se não conseguir salvar
      }
    }

    return calculatedData;
  } catch (error) {
    console.error("Erro ao buscar retrospectiva mensal:", error);
    return null;
  }
}

async function calculateMonthlyRetrospective(
  companyId: string,
  year: number,
  month: number,
) {
  // Definir datas do período específico
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Buscar o pipeline_id da configuração da empresa
  const { data: configData, error: configError } = await supabase
    .from("kommo_config")
    .select("pipeline_id")
    .eq("company_id", companyId)
    .single();

  if (configError || !configData?.pipeline_id) {
    console.error("Erro ao buscar pipeline_id da kommo_config:", configError);
    return null;
  }

  const pipelineId = configData.pipeline_id;

  // Buscar todos os corretores ativos da empresa
  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("company_id", companyId)
    .eq("active", true)
    .eq("cargo", "Corretor");

  if (!brokers || brokers.length === 0) {
    return null;
  }

  // Calcular métricas para cada corretor baseado no período específico
  const brokersWithMetrics = await Promise.all(
    brokers.map(async (broker) => {
      // Buscar leads do período específico
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("responsavel_id", broker.id)
        .eq("company_id", companyId)
        .eq("pipeline_id", pipelineId)
        .gte("criado_em", startDate.toISOString())
        .lte("criado_em", endDate.toISOString());

      // Buscar atividades do período específico
      const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", broker.id)
        .eq("company_id", companyId)
        .gte("criado_em", startDate.toISOString())
        .lte("criado_em", endDate.toISOString());

      // Calcular vendas fechadas e VGV
      const vendasFechadas =
        leads?.filter((lead) => lead.status_id === 142) || [];
      const valorVendas = vendasFechadas.reduce(
        (sum, lead) => sum + (parseFloat(lead.valor?.toString() || "0") || 0),
        0,
      );

      const ticketMedio =
        vendasFechadas.length > 0 ? valorVendas / vendasFechadas.length : 0;

      // Buscar pontuação do último dia do mês na tabela broker_points
      const { data: brokerPoints, error: pointsError } = await supabase
        .from("broker_points")
        .select("pontos, updated_at")
        .eq("id", broker.id)
        .eq("company_id", companyId)
        .gte("updated_at", startDate.toISOString())
        .lte("updated_at", endDate.toISOString())
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pointsError) {
        console.error(
          `Erro ao buscar pontos do corretor ${broker.id} para ${month}/${year}:`,
          pointsError,
        );
      }

      console.log(
        `Pontos encontrados para ${broker.nome} (${broker.id}) em ${month}/${year}:`,
        brokerPoints
          ? `${brokerPoints.pontos} pts (${brokerPoints.updated_at})`
          : "Nenhum registro",
      );

      return {
        ...broker,
        monthlyMetrics: {
          leadsCapturados: leads?.length || 0,
          vendasRealizadas: vendasFechadas.length,
          valorVendas: valorVendas,
          atividadesRealizadas: activities?.length || 0,
          pontuacaoAtual: brokerPoints?.pontos || 0,
          ticketMedio: ticketMedio,
        },
      };
    }),
  );

  // Filtrar apenas corretores com pontuação válida (que tinham dados no período)
  const brokersWithValidPoints = brokersWithMetrics.filter(
    (broker) => broker.monthlyMetrics.pontuacaoAtual > 0,
  );

  // Se não houver corretores com pontos válidos, usar todos os corretores
  const brokersForRanking =
    brokersWithValidPoints.length > 0
      ? brokersWithValidPoints
      : brokersWithMetrics;

  // Encontrar vencedores
  const vencedores = {
    maiorPontuacao: brokersForRanking.reduce((prev, current) =>
      current.monthlyMetrics.pontuacaoAtual > prev.monthlyMetrics.pontuacaoAtual
        ? current
        : prev,
    ),
    maiorVendas: brokersWithMetrics.reduce((prev, current) =>
      current.monthlyMetrics.valorVendas > prev.monthlyMetrics.valorVendas
        ? current
        : prev,
    ),
    maisLeads: brokersWithMetrics.reduce((prev, current) =>
      current.monthlyMetrics.leadsCapturados >
      prev.monthlyMetrics.leadsCapturados
        ? current
        : prev,
    ),
    maisAtivo: brokersWithMetrics.reduce((prev, current) =>
      current.monthlyMetrics.atividadesRealizadas >
      prev.monthlyMetrics.atividadesRealizadas
        ? current
        : prev,
    ),
  };

  // Criar rankings
  const rankings = {
    porPontos: [...brokersForRanking].sort(
      (a, b) =>
        b.monthlyMetrics.pontuacaoAtual - a.monthlyMetrics.pontuacaoAtual,
    ),
    porVendas: [...brokersWithMetrics].sort(
      (a, b) => b.monthlyMetrics.valorVendas - a.monthlyMetrics.valorVendas,
    ),
    porLeads: [...brokersWithMetrics].sort(
      (a, b) =>
        b.monthlyMetrics.leadsCapturados - a.monthlyMetrics.leadsCapturados,
    ),
    porAtividades: [...brokersWithMetrics].sort(
      (a, b) =>
        b.monthlyMetrics.atividadesRealizadas -
        a.monthlyMetrics.atividadesRealizadas,
    ),
  };

  // Calcular resumo geral
  const resumoGeral = {
    totalCorretores: brokersWithMetrics.length,
    totalLeads: brokersWithMetrics.reduce(
      (sum, broker) => sum + broker.monthlyMetrics.leadsCapturados,
      0,
    ),
    totalVendas: brokersWithMetrics.reduce(
      (sum, broker) => sum + broker.monthlyMetrics.valorVendas,
      0,
    ),
    totalAtividades: brokersWithMetrics.reduce(
      (sum, broker) => sum + broker.monthlyMetrics.atividadesRealizadas,
      0,
    ),
    mediaPontos:
      brokersForRanking.length > 0
        ? brokersForRanking.reduce(
            (sum, broker) => sum + broker.monthlyMetrics.pontuacaoAtual,
            0,
          ) / brokersForRanking.length
        : 0,
    corretoresComPontos: brokersForRanking.length,
  };

  const retrospectiveData = {
    periodo: {
      mes: month,
      ano: year,
      mesNome: monthNames[month - 1],
      dataInicio: startDate.toISOString().split("T")[0],
      dataFim: endDate.toISOString().split("T")[0],
    },
    vencedores,
    rankings,
    resumoGeral,
  };

  return retrospectiveData;
}

export async function getMonthlyWinnersHistory(
  companyId: string,
  limite: number = 12,
) {
  try {
    // Buscar diretamente da tabela monthly_retrospectives com limite e ordenação
    const { data: savedHistory, error } = await supabase
      .from("monthly_retrospectives")
      .select("data, year, month")
      .eq("company_id", companyId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(limite);

    if (error) {
      console.error(
        "Erro ao buscar histórico da tabela monthly_retrospectives:",
        error,
      );
    }

    // Se encontrou dados salvos, usar eles
    if (savedHistory && savedHistory.length > 0) {
      console.log(
        `Encontrados ${savedHistory.length} registros salvos na tabela monthly_retrospectives`,
      );
      return savedHistory.map((record) => record.data);
    }

    // Fallback: buscar dados usando o método antigo se não houver dados salvos
    console.log(
      "Nenhum dado encontrado na tabela monthly_retrospectives, calculando em tempo real...",
    );
    const history = [];
    const currentDate = new Date();

    for (let i = 1; i <= limite; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      try {
        const retrospective = await getMonthlyRetrospective(
          companyId,
          year,
          month,
        );
        if (retrospective) {
          history.push(retrospective);
        }
      } catch (error) {
        console.error(`Erro ao buscar dados para ${month}/${year}:`, error);
      }
    }

    return history;
  } catch (error) {
    console.error("Erro ao buscar histórico de vencedores:", error);
    return [];
  }
}

// Função para salvar dados de retrospectiva mensal (chamada automaticamente)
export async function saveMonthlyRetrospective(
  companyId: string,
  year: number,
  month: number,
) {
  try {
    // Calcular dados do mês
    const retrospectiveData = await calculateMonthlyRetrospective(
      companyId,
      year,
      month,
    );

    if (!retrospectiveData) {
      return null;
    }

    // Salvar no banco
    const { data, error } = await supabase
      .from("monthly_retrospectives")
      .upsert(
        {
          company_id: companyId,
          year: year,
          month: month,
          data: retrospectiveData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "company_id,year,month",
        },
      )
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar retrospectiva mensal:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao salvar retrospectiva mensal:", error);
    return null;
  }
}

// Função para processar retrospectivas pendentes (pode ser chamada via cron job)
export async function processMonthlyRetrospectives() {
  try {
    // Buscar todas as empresas ativas
    const { data: companies } = await supabase
      .schema("cf_companies")
      .from("companies")
      .select("id")
      .eq("active", true);

    if (!companies) return;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Processar apenas meses anteriores
    for (const company of companies) {
      // Verificar se já existe registro para o mês anterior
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const { data: existingRecord } = await supabase
        .from("monthly_retrospectives")
        .select("id")
        .eq("company_id", company.id)
        .eq("year", previousYear)
        .eq("month", previousMonth)
        .single();

      // Se não existe, criar
      if (!existingRecord) {
        await saveMonthlyRetrospective(
          company.id.toString(),
          previousYear,
          previousMonth,
        );
        console.log(
          `Retrospectiva salva para empresa ${company.id} - ${previousMonth}/${previousYear}`,
        );
      }
    }
  } catch (error) {
    console.error("Erro ao processar retrospectivas mensais:", error);
  }
}

// Funções para gerenciar filtros de componentes
export async function getComponentFilters(companyId: string) {
  const { data, error } = await supabase
    .from("component_filters")
    .select("*")
    .eq("company_id", companyId)
    .order("component_name");

  if (error) {
    throw new Error(`Erro ao buscar filtros: ${error.message}`);
  }

  return data;
}

export async function getComponentFilter(
  companyId: string,
  componentName: string,
) {
  const { data, error } = await supabase
    .from("component_filters")
    .select("*")
    .eq("company_id", companyId)
    .eq("component_name", componentName)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Erro ao buscar filtro: ${error.message}`);
  }

  return data;
}

export async function createComponentFilter(
  companyId: string,
  filterData: any,
) {
  const { data, error } = await supabase
    .from("component_filters")
    .insert({
      company_id: companyId,
      component_name: filterData.component_name,
      filter_type: filterData.filter_type,
      start_date: filterData.start_date || null,
      end_date: filterData.end_date || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar filtro: ${error.message}`);
  }

  return data;
}

export async function updateComponentFilter(
  companyId: string,
  filterId: number,
  filterData: any,
) {
  const { data, error } = await supabase
    .from("component_filters")
    .update({
      filter_type: filterData.filter_type,
      start_date: filterData.start_date || null,
      end_date: filterData.end_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", filterId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar filtro: ${error.message}`);
  }

  return data;
}

// Função para validar se uma data é válida
function isValidDate(d: any): boolean {
  if (!d) return false;
  
  if (!(d instanceof Date)) {
    // Tentar converter string para Date se necessário
    try {
      d = new Date(d);
    } catch (error) {
      return false;
    }
  }
  
  const time = d.getTime();
  // Verificar se é um número válido e não é uma data muito antiga (antes de 1970) ou muito futura
  const minDate = new Date('1970-01-01').getTime();
  const maxDate = new Date('2100-01-01').getTime();
  
  return !isNaN(time) && time >= minDate && time <= maxDate;
}

// Função para obter range de datas baseado no tipo de filtro em GMT-3
export function getDateRangeBrazil(
  filterType: string,
  startDate?: string,
  endDate?: string,
  month?: string | number,
  year?: string | number,
): { start: Date; end: Date; startFormatted: string; endFormatted: string } {
  // Criar data atual no fuso GMT-3
  const nowUTC = new Date();
  const now = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000)); // GMT-3

  const formatDateForDB = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  };

  switch (filterType) {
    case "month": {
      const m = Number(month);
      const y = Number(year);
      const base =
        !Number.isNaN(m) && m >= 1 && m <= 12 && !Number.isNaN(y)
          ? new Date(y, m - 1, 1)
          : new Date(now.getFullYear(), now.getMonth(), 1);

      const start = new Date(
        base.getFullYear(),
        base.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      // Converter para UTC considerando GMT-3
      const startUTC = new Date(start.getTime() + (3 * 60 * 60 * 1000));
      const endUTC = new Date(end.getTime() + (3 * 60 * 60 * 1000));

      return {
        start: startUTC,
        end: endUTC,
        startFormatted: formatDateForDB(startUTC),
        endFormatted: formatDateForDB(endUTC),
      };
    }
    case "7_days":
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const nowEnd = new Date(now);
      nowEnd.setHours(23, 59, 59, 999);

      // Converter para UTC considerando GMT-3
      const sevenDaysUTC = new Date(sevenDaysAgo.getTime() + (3 * 60 * 60 * 1000));
      const nowEndUTC = new Date(nowEnd.getTime() + (3 * 60 * 60 * 1000));

      return {
        start: sevenDaysUTC,
        end: nowEndUTC,
        startFormatted: formatDateForDB(sevenDaysUTC),
        endFormatted: formatDateForDB(nowEndUTC),
      };

    case "30_days":
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const thirtyDaysEnd = new Date(now);
      thirtyDaysEnd.setHours(23, 59, 59, 999);

      // Converter para UTC considerando GMT-3
      const thirtyDaysUTC = new Date(thirtyDaysAgo.getTime() + (3 * 60 * 60 * 1000));
      const thirtyDaysEndUTC = new Date(thirtyDaysEnd.getTime() + (3 * 60 * 60 * 1000));

      return {
        start: thirtyDaysUTC,
        end: thirtyDaysEndUTC,
        startFormatted: formatDateForDB(thirtyDaysUTC),
        endFormatted: formatDateForDB(thirtyDaysEndUTC),
      };

    case "current_week":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Converter para UTC considerando GMT-3
      const startWeekUTC = new Date(startOfWeek.getTime() + (3 * 60 * 60 * 1000));
      const endWeekUTC = new Date(endOfWeek.getTime() + (3 * 60 * 60 * 1000));

      return {
        start: startWeekUTC,
        end: endWeekUTC,
        startFormatted: formatDateForDB(startWeekUTC),
        endFormatted: formatDateForDB(endWeekUTC),
      };

    case "current_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      // Converter para UTC considerando GMT-3
      const startMonthUTC = new Date(startOfMonth.getTime() + (3 * 60 * 60 * 1000));
      const endMonthUTC = new Date(endOfMonth.getTime() + (3 * 60 * 60 * 1000));

      return {
        start: startMonthUTC,
        end: endMonthUTC,
        startFormatted: formatDateForDB(startMonthUTC),
        endFormatted: formatDateForDB(endMonthUTC),
      };

    case "last_month":
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      startOfLastMonth.setHours(0, 0, 0, 0);
      const endOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );

      // Converter para UTC considerando GMT-3
      const startLastMonthUTC = new Date(startOfLastMonth.getTime() + (3 * 60 * 60 * 1000));
      const endLastMonthUTC = new Date(endOfLastMonth.getTime() + (3 * 60 * 60 * 1000));

      return {
        start: startLastMonthUTC,
        end: endLastMonthUTC,
        startFormatted: formatDateForDB(startLastMonthUTC),
        endFormatted: formatDateForDB(endLastMonthUTC),
      };

    case "custom_range":
      if (startDate && endDate) {
        // Para datas customizadas, assumir que já estão em GMT-3 e converter para UTC
        const start = new Date(startDate + "T00:00:00.000-03:00");
        const end = new Date(endDate + "T23:59:59.999-03:00");

        return {
          start,
          end,
          startFormatted: formatDateForDB(start),
          endFormatted: formatDateForDB(end),
        };
      }
      break;

    default:
      // Default para mês atual em GMT-3
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
      defaultStart.setHours(0, 0, 0, 0);
      const defaultEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      // Converter para UTC considerando GMT-3
      const defaultStartUTC = new Date(defaultStart.getTime() + (3 * 60 * 60 * 1000));
      const defaultEndUTC = new Date(defaultEnd.getTime() + (3 * 60 * 60 * 1000));

      return {
        start: defaultStartUTC,
        end: defaultEndUTC,
        startFormatted: formatDateForDB(defaultStartUTC),
        endFormatted: formatDateForDB(defaultEndUTC),
      };
  }

  // Fallback para mês atual em GMT-3
  const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1);
  fallbackStart.setHours(0, 0, 0, 0);
  const fallbackEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  // Converter para UTC considerando GMT-3
  const fallbackStartUTC = new Date(fallbackStart.getTime() + (3 * 60 * 60 * 1000));
  const fallbackEndUTC = new Date(fallbackEnd.getTime() + (3 * 60 * 60 * 1000));

  return {
    start: fallbackStartUTC,
    end: fallbackEndUTC,
    startFormatted: formatDateForDB(fallbackStartUTC),
    endFormatted: formatDateForDB(fallbackEndUTC),
  };
}

// Função para obter range de datas baseado no tipo de filtro (mantida para compatibilidade)
export function getDateRange(
  filterType: string,
  startDate?: string,
  endDate?: string,
  month?: string | number,
  year?: string | number,
): { start: Date; end: Date; startFormatted: string; endFormatted: string } {
  const now = new Date();

  const formatDateForDB = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  };

  switch (filterType) {
    // ✅ NOVO: mês/ano selecionados manualmente no frontend
    case "month": {
      const m = Number(month);
      const y = Number(year);
      const base =
        !Number.isNaN(m) && m >= 1 && m <= 12 && !Number.isNaN(y)
          ? new Date(y, m - 1, 1)
          : new Date(now.getFullYear(), now.getMonth(), 1);

      const start = new Date(
        base.getFullYear(),
        base.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      return {
        start,
        end,
        startFormatted: formatDateForDB(start),
        endFormatted: formatDateForDB(end),
      };
    }
    case "7_days":
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const nowEnd = new Date(now);
      nowEnd.setHours(23, 59, 59, 999);

      return {
        start: sevenDaysAgo,
        end: nowEnd,
        startFormatted: formatDateForDB(sevenDaysAgo),
        endFormatted: formatDateForDB(nowEnd),
      };

    case "30_days":
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const thirtyDaysEnd = new Date(now);
      thirtyDaysEnd.setHours(23, 59, 59, 999);

      return {
        start: thirtyDaysAgo,
        end: thirtyDaysEnd,
        startFormatted: formatDateForDB(thirtyDaysAgo),
        endFormatted: formatDateForDB(thirtyDaysEnd),
      };

    case "current_week":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return {
        start: startOfWeek,
        end: endOfWeek,
        startFormatted: formatDateForDB(startOfWeek),
        endFormatted: formatDateForDB(endOfWeek),
      };

    case "current_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      return {
        start: startOfMonth,
        end: endOfMonth,
        startFormatted: formatDateForDB(startOfMonth),
        endFormatted: formatDateForDB(endOfMonth),
      };

    case "last_month":
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      startOfLastMonth.setHours(0, 0, 0, 0);
      const endOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );

      return {
        start: startOfLastMonth,
        end: endOfLastMonth,
        startFormatted: formatDateForDB(startOfLastMonth),
        endFormatted: formatDateForDB(endOfLastMonth),
      };

    case "custom_range":
      if (startDate && endDate) {
        // Para datas customizadas, assumir que já estão em GMT-3
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return {
          start,
          end,
          startFormatted: formatDateForDB(start),
          endFormatted: formatDateForDB(end),
        };
      }
      break;

    default:
      // Default para mês atual em GMT-3
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
      defaultStart.setHours(0, 0, 0, 0);
      const defaultEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      return {
        start: defaultStart,
        end: defaultEnd,
        startFormatted: formatDateForDB(defaultStart),
        endFormatted: formatDateForDB(defaultEnd),
      };
  }

  // Fallback para mês atual em GMT-3
  const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1);
  fallbackStart.setHours(0, 0, 0, 0);
  const fallbackEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return {
    start: fallbackStart,
    end: fallbackEnd,
    startFormatted: formatDateForDB(fallbackStart),
    endFormatted: formatDateForDB(fallbackEnd),
  };
}