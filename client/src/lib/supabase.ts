import { createClient } from "@supabase/supabase-js";

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Key are required. Please check your environment variables.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Broker related queries
export async function getBrokerRankings() {
  const { data, error } = await supabase
    .from("broker_points")
    .select(
      `
      *,
      brokers!inner(*)
    `,
    )
    .eq("brokers.active", true)
    .order("pontos", { ascending: false });

  if (error) {
    console.error("Error fetching broker rankings:", error);
    throw error;
  }

  return data;
}

export async function getBrokerById(id: number) {
  const { data, error } = await supabase
    .from("brokers")
    .select("*")
    .eq("id", id)
    .eq("active", true)
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

export async function getBrokerPoints(id: number) {
  const { data, error } = await supabase
    .from("broker_points")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching points for broker with ID ${id}:`, error);
    throw error;
  }

  return data;
}

// Nova função para encontrar a posição do broker no ranking
export async function getBrokerRankPosition(id: number) {
  try {
    // Primeiro, vamos buscar todos os brokers ordenados por pontuação
    const { data, error } = await supabase
      .from("broker_points")
      .select("id")
      .order("pontos", { ascending: false });

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

export async function getBrokerLeads(id: number) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("responsavel_id", id)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(`Error fetching leads for broker with ID ${id}:`, error);
    throw error;
  }

  return data;
}

export async function getKommoConfig(company_id: number | undefined) {
  if (!company_id) return null;
  
  const { data, error } = await supabase
    .from("kommo_config")
    .select("*")
    .eq("company_id", company_id)
    .single();

  if (error) {
    console.error(`Error fetching kommo config for company ${company_id}:`, error);
    throw error;
  }

  return data;
}

export async function getBrokerActivities(id: number) {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", id)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(`Error fetching activities for broker with ID ${id}:`, error);
    throw error;
  }

  return data;
}

// Analytics related queries
export async function getBrokerPerformance(brokerId: number) {
  // Gerar dados de performance mensal baseados nas atividades
  try {
    // Obter as atividades e leads do corretor
    const activities = await getBrokerActivities(brokerId);
    const leads = await getBrokerLeads(brokerId);

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

// Função auxiliar para gerar heatmap de atividades
export async function getActivityHeatmap(brokerId: number) {
  try {
    // Buscar apenas mensagens enviadas pelo corretor entre 8h e 22h (apenas dias úteis)
    const { data, error } = await supabase
      .from("activities")
      .select("dia_semana, hora")
      .eq("user_id", brokerId)
      .eq("tipo", "mensagem_enviada")
      .gte("hora", 8) // A partir das 8h
      .lte("hora", 22); // Até as 22h

    if (error) {
      throw error;
    }

    // Gerar heatmap (apenas para os dias da semana e horário comercial estendido)
    const dias = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    // Horários das 8h às 22h (horário comercial estendido)
    const horarios = Array.from({ length: 15 }, (_, i) => `${i + 8}h`);

    // Inicializar matriz de dados com zeros - 7 dias x 15 horas (8h-22h)
    const dados = Array(7)
      .fill(0)
      .map(() => Array(15).fill(0));

    // Preencher os dados
    if (data) {
      data.forEach((activity) => {
        const diaIndex = dias.indexOf(activity.dia_semana);
        // Ajustar a hora para o intervalo do array (0-14 representa 8h-22h)
        const horaAjustada = activity.hora - 8;

        if (diaIndex >= 0 && horaAjustada >= 0 && horaAjustada < 15) {
          dados[diaIndex][horaAjustada]++;
        }
      });
    }

    return {
      dias,
      horarios,
      dados,
    };
  } catch (error) {
    console.error(`Error generating heatmap for broker ${brokerId}:`, error);
    throw error;
  }
}

// Função auxiliar para obter alertas do corretor
export async function getBrokerAlerts(brokerId: number) {
  try {
    // Obter os pontos do corretor
    const brokerPoints = await getBrokerPoints(brokerId);

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

    // Verificar leads respondidos após 18h
    if (brokerPoints.leads_respondidos_apos_18h > 0) {
      alerts.push({
        tipo: "warning",
        mensagem: "Leads respondidos após 18h",
        quantidade: brokerPoints.leads_respondidos_apos_18h,
      });
    }

    // Verificar leads sem mudança por 5+ dias
    if (brokerPoints.leads_5_dias_sem_mudanca > 0) {
      alerts.push({
        tipo: "critical",
        mensagem: "Leads sem atualização há mais de 5 dias",
        quantidade: brokerPoints.leads_5_dias_sem_mudanca,
      });
    }

    return alerts;
  } catch (error) {
    console.error(`Error generating alerts for broker ${brokerId}:`, error);
    throw error;
  }
}

// Funções para obter métricas gerais do dashboard
export async function getTotalLeads() {
  try {
    // Buscar leads apenas de corretores ativos
    const { data, error } = await supabase
      .from("leads")
      .select("id, brokers!inner(*)")
      .eq("brokers.cargo", "Corretor")
      .eq("brokers.active", true);

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error("Error fetching total leads:", error);
    return 0;
  }
}

export async function getActiveBrokers() {
  try {
    // Consultar corretores ativos e contar o resultado
    const { data, error } = await supabase
      .from("brokers")
      .select("id")
      .eq("cargo", "Corretor")
      .eq("active", true);

    if (error) throw error;

    return data?.length || 0;
  } catch (error) {
    console.error("Error fetching active brokers:", error);
    return 0;
  }
}

export async function getAveragePoints() {
  try {
    const { data, error } = await supabase
      .from("broker_points")
      .select("pontos");

    if (error) throw error;

    if (!data || data.length === 0) return 0;

    const total = data.reduce((sum, broker) => sum + (broker.pontos || 0), 0);
    return Math.round(total / data.length);
  } catch (error) {
    console.error("Error calculating average points:", error);
    return 0;
  }
}

export async function getTotalSales() {
  try {
    const { data, error } = await supabase
      .from("broker_points")
      .select("vendas_realizadas");

    if (error) throw error;

    if (!data) return 0;

    return data.reduce(
      (sum, broker) => sum + (broker.vendas_realizadas || 0),
      0,
    );
  } catch (error) {
    console.error("Error calculating total sales:", error);
    return 0;
  }
}

// Função para obter todas as métricas do dashboard de uma só vez
export async function getDashboardMetrics() {
  try {
    const [totalLeads, activeBrokers, averagePoints, totalSales] =
      await Promise.all([
        getTotalLeads(),
        getActiveBrokers(),
        getAveragePoints(),
        getTotalSales(),
      ]);

    return {
      totalLeads,
      activeBrokers,
      averagePoints,
      totalSales,
    };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return {
      totalLeads: 0,
      activeBrokers: 0,
      averagePoints: 0,
      totalSales: 0,
    };
  }
}

// Funções auxiliares para análise de dados
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
