import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./supabase";
import {
  getActiveBrokers,
  getMaxPoints,
  getTotalSales,
  getLeadsByStageCurrentMonth,
  getTotalLeads,
  updateComponentFilter,
  processMonthlyRetrospectives,
  saveMonthlyRetrospective,
  getComponentFilters,
  getMonthlyRetrospective,
  getMonthlyWinnersHistory,
  getBrokerWeeklyPerformanceMetrics,
  getBrokerInactivityTime,
  getBrokerAlerts,
  getBrokerPerformance,
  getBrokerActivities,
  getPipelinesInfo,
  getPipelineIds,
  getBrokers,
  getTotalLeadsBroker,
  getBrokerRankPosition,
  getBrokerById,
  getBrokerRankings,
  getBrokerPoints,
  getBrokerLeads,
  getBrokerLeadsWithTicket,
  getBrokerLeadEtapaCounts,
  getBrokerTotalLeadsLastMonth,
  getKommoConfig,
  getLostLeadsByStage,
  getMonthlyComparison,
  getDateRange,
  getActivityHeatmap, // Add missing import
} from "./supabase";
import {
  getCompanyBranding,
  updateCompanyBranding,
} from "./routes/company-branding";
import { getCompanyStatus } from "./routes/company-status";
import { companyContext } from "./middlewares/companyContext";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/company-status", companyContext, getCompanyStatus);

  app.get("/ranking", companyContext, (req, res) => {
    res.sendFile("index.html", { root: "dist" }); // ou onde estiver seu frontend
  });

  app.use("/api", companyContext);
  // Rota para obter o ranking de corretores (pontos)
  app.get("/api/brokers/rankings", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const { month, year } = req.query;

      console.log(
        `Buscando rankings para empresa ${companyId}, mês: ${month}, ano: ${year}`,
      );

      const rankings = await getBrokerRankings(
        companyId,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined,
      );

      console.log(`Encontrados ${rankings.length} corretores no ranking`);

      res.json(rankings);
    } catch (error) {
      console.error("Erro ao buscar ranking de corretores:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar ranking de corretores" });
    }
  });

  // Rota para obter detalhes de um corretor específico
  app.get("/api/brokers/:id", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);

      if (isNaN(brokerId) || !brokerId) {
        return res.status(400).json({ error: "ID do corretor inválido" });
      }

      if (!companyId) {
        return res.status(400).json({ error: "Company ID não encontrado" });
      }

      const broker = await getBrokerById(brokerId, companyId);

      if (!broker || !broker.active) {
        return res
          .status(204)
          .json({ message: "Corretor inativo ou não encontrado" });
      }

      res.json(broker);
    } catch (error) {
      console.error("Erro ao buscar corretor:", error);
      res.status(500).json({ message: "Falha ao buscar detalhes do corretor" });
    }
  });

  // Rota para obter a posição no ranking
  app.get("/api/brokers/:id/rank-position", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const position = await getBrokerRankPosition(brokerId, companyId);
      res.json({ position });
    } catch (error) {
      console.error("Erro ao buscar posição no ranking:", error);
      res.status(500).json({ message: "Falha ao buscar posição no ranking" });
    }
  });

  // Rota para obter pontos de todos os corretores com ordenação
  app.get("/api/brokers/points", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const { month, year } = req.query;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID não encontrado" });
      }

      console.log(
        `Buscando pontos de todos os corretores para empresa ${companyId}, mês: ${month}, ano: ${year}`,
      );

      // Usar a função getBrokerRankings que já retorna todos os corretores com ordenação
      const rankings = await getBrokerRankings(
        companyId,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined,
      );

      console.log(`Encontrados ${rankings.length} corretores com pontos`);

      res.json(rankings);
    } catch (error) {
      console.error("Erro ao buscar pontos de todos os corretores:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar pontos dos corretores" });
    }
  });

  app.get("/api/brokers/:id/points", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const { filterType, startDate, endDate, allPipelines } = req.query;

      if (isNaN(brokerId) || !brokerId) {
        return res.status(400).json({ error: "ID do corretor inválido" });
      }

      if (!companyId) {
        return res.status(400).json({ error: "Company ID não encontrado" });
      }

      const { startFormatted, endFormatted } = getDateRange(
        filterType as string,
        startDate as string,
        endDate as string,
      );

      const points = await getBrokerPoints(
        brokerId,
        companyId,
        startFormatted,
        endFormatted,
        allPipelines === "true",
      );

      res.json(points);
    } catch (error) {
      console.error("Erro ao buscar pontos do corretor:", error);
      res.status(500).json({ message: "Falha ao buscar pontos do corretor" });
    }
  });

  // Rota para obter leads de um corretor
  app.get("/api/brokers/:id/leads/count", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const leads = await getTotalLeadsBroker(brokerId, companyId);

      res.json(leads);
    } catch (error) {
      console.error("Erro ao buscar leads do corretor:", error);
      res.status(500).json({ message: "Falha ao buscar leads do corretor" });
    }
  });

  // Rota para obter total de leads do mês passado de um corretor
  app.get("/api/brokers/:id/total-leads-last-month", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);

      if (isNaN(brokerId) || !brokerId) {
        return res.status(400).json({ error: "ID do corretor inválido" });
      }

      if (!companyId) {
        return res.status(400).json({ error: "Company ID não encontrado" });
      }

      const totalLeads = await getBrokerTotalLeadsLastMonth(
        brokerId,
        companyId,
      );

      res.json({ total_leads: totalLeads });
    } catch (error) {
      console.error("Erro ao buscar total de leads do mês passado:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota para obter total de leads do mês passado de todos os corretores
  app.get("/api/brokers/total-leads-last-month", async (req, res) => {
    try {
      const companyId = (req as any).companyId;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID não encontrado" });
      }

      // Buscar todos os corretores ativos da empresa usando supabaseServer
      const brokers = await getBrokers(companyId);

      console.log("Corretores encontrados:", brokers);
      if (!brokers || brokers.length === 0) {
        return res.json({});
      }

      // Filtrar apenas corretores ativos com cargo "Corretor"
      const activeBrokers = brokers.filter(
        (broker) =>
          broker.active === true &&
          broker.cargo === "Corretor" &&
          broker.id &&
          !isNaN(broker.id),
      );

      if (activeBrokers.length === 0) {
        return res.json({});
      }

      // Buscar total de leads para cada corretor
      const leadsCountByBroker: Record<number, number> = {};

      await Promise.all(
        activeBrokers.map(async (broker) => {
          try {
            if (!broker.id || isNaN(broker.id)) {
              console.error(`ID do corretor inválido: ${broker.id}`);
              return;
            }

            const totalLeads = await getBrokerTotalLeadsLastMonth(
              broker.id,
              companyId,
            );
            leadsCountByBroker[broker.id] = totalLeads;
          } catch (error) {
            console.error(
              `Erro ao buscar leads do corretor ${broker.id}:`,
              error,
            );
            leadsCountByBroker[broker.id] = 0;
          }
        }),
      );

      res.json(leadsCountByBroker);
    } catch (error) {
      console.error("Erro ao buscar total de leads por corretor:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/brokers/:id/leads", companyContext, async (req, res) => {
    try {
      const brokerId = parseInt(req.params.id);
      const companyId = (req as any).companyId;

      if (isNaN(brokerId)) {
        return res.status(400).json({ error: "ID do corretor inválido" });
      }

      const leads = await getBrokerLeads(brokerId, companyId);

      // Calcular ticket médio apenas das vendas fechadas (status_id = 142)
      const vendasFechadas = leads.filter(
        (lead: any) => lead.status_id === 142,
      );
      const ticketMedio =
        vendasFechadas.length > 0
          ? vendasFechadas.reduce((sum: number, lead: any) => {
              const valor =
                typeof lead.valor === "number"
                  ? lead.valor
                  : parseFloat(lead.valor?.toString() || "0") || 0;
              return sum + valor;
            }, 0) / vendasFechadas.length
          : 0;

      res.json({
        leads,
        ticket_medio: ticketMedio,
        vendas_fechadas: vendasFechadas.length,
      });
    } catch (error) {
      console.error("Erro ao buscar leads do corretor:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/brokers/:id/leads-with-ticket", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const { filterType, startDate, endDate, allPipelines } = req.query;

      const { startFormatted, endFormatted } = getDateRange(
        filterType as string,
        startDate as string,
        endDate as string,
      );

      const result = await getBrokerLeadsWithTicket(
        brokerId,
        companyId,
        startFormatted,
        endFormatted,
        allPipelines === "true",
      );

      res.json(result);
    } catch (error) {
      console.error("Erro ao buscar leads do corretor:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar leads com ticket médio" });
    }
  });

  // Rota para buscar leads perdidos por etapa de um corretor
  app.get("/api/brokers/:id/lost-leads", async (req, res) => {
    try {
      const brokerId = req.params.id;
      const companyId = (req as any).companyId;
      const { filterType, startDate, endDate, allPipelines } = req.query;

      const { startFormatted, endFormatted } = getDateRange(
        filterType as string,
        startDate as string,
        endDate as string,
      );

      // Timeout para evitar travamento
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 30000);
      });

      const lostLeadsPromise = getLostLeadsByStage(
        companyId,
        brokerId,
        startFormatted,
        endFormatted,
        allPipelines === "true",
      );

      const lostLeads = await Promise.race([lostLeadsPromise, timeoutPromise]);

      res.set("Cache-Control", "public, max-age=300");
      res.json(lostLeads);
    } catch (error) {
      console.error("Erro ao buscar leads perdidos:", error);
      if ((error as Error).message === "Timeout") {
        res.status(408).json({ message: "Timeout ao buscar dados" });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // Rota segura para obter configuração dos pipelines (sem expor credenciais)
  app.get("/api/companies/pipeline-config", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const config = await getKommoConfig(companyId);

      if (!config) {
        return res.status(404).json({ message: "Configuração não encontrada" });
      }

      // Retornar informações dos pipelines sem expor credenciais
      const pipelinesInfo = getPipelinesInfo(config);
      const pipelineIds = getPipelineIds(config);

      res.json({
        pipeline_ids: pipelineIds,
        pipelines: pipelinesInfo,
        company_id: config.company_id,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do pipeline:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/brokers/:id/etapas", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const { filterType, startDate, endDate, allPipelines } = req.query;

      const { startFormatted, endFormatted } = getDateRange(
        filterType as string,
        startDate as string,
        endDate as string,
      );

      const etapas = await getBrokerLeadEtapaCounts(
        brokerId,
        companyId,
        startFormatted,
        endFormatted,
        allPipelines === "true",
      );

      res.json(etapas);
    } catch (error) {
      console.error("Erro ao buscar etapas dos leads do corretor:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar etapas dos leads do corretor" });
    }
  });

  // Rota para obter atividades de um corretor
  app.get("/api/brokers/:id/activities", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const activities = await getBrokerActivities(brokerId, companyId);

      res.json(activities);
    } catch (error) {
      console.error("Erro ao buscar atividades do corretor:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar atividades do corretor" });
    }
  });

  // Rota para obter performance de um corretor
  app.get("/api/brokers/:id/performance", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const performance = await getBrokerPerformance(brokerId, companyId);

      res.json(performance);
    } catch (error) {
      console.error("Erro ao buscar performance do corretor:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar dados de performance do corretor" });
    }
  });

  // Rota para obter heatmap de atividades de um corretor
  app.get("/api/brokers/:id/heatmap", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const { filterType, startDate, endDate, allPipelines } = req.query;

      const { startFormatted, endFormatted } = getDateRange(
        filterType as string,
        startDate as string,
        endDate as string,
      );

      const heatmap = await getActivityHeatmap(
        brokerId,
        companyId,
        startFormatted,
        endFormatted,
        allPipelines === "true",
      );

      res.json(heatmap);
    } catch (error) {
      console.error("Erro ao buscar heatmap do corretor:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar mapa de calor de atividades" });
    }
  });

  app.get("/api/brokers/:id/weekly-heatmap", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const { filterType, startDate, endDate, allPipelines } = req.query;

      const { startFormatted, endFormatted } = getDateRange(
        filterType as string,
        startDate as string,
        endDate as string,
      );

      const heatmap = await getActivityHeatmap(brokerId, companyId);

      res.json(heatmap);
    } catch (error) {
      console.error("Erro ao buscar heatmap semanal do corretor:", error);
      res.status(500).json({
        message: "Falha ao buscar mapa de calor de atividades da semana",
      });
    }
  });

  // Rota para obter alertas de um corretor
  app.get("/api/brokers/:id/alerts", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const alerts = await getBrokerAlerts(brokerId, companyId);

      res.json(alerts);
    } catch (error) {
      console.error("Erro ao buscar alertas do corretor:", error);
      res.status(500).json({ message: "Falha ao buscar alertas do corretor" });
    }
  });

  // Rota para obter tempo de inatividade do corretor
  app.get("/api/brokers/:id/inactivity-time", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const inactivityTime = await getBrokerInactivityTime(brokerId, companyId);

      res.json({ inactivity_time: inactivityTime });
    } catch (error) {
      console.error("Erro ao buscar tempo de inatividade do corretor:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar tempo de inatividade do corretor" });
    }
  });

  app.get("/api/brokers/:id/weekly-performance", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);
      const { filterType, startDate, endDate } = req.query;

      let filter = null;
      if (filterType) {
        filter = {
          filter_type: filterType as string,
          start_date: startDate as string,
          end_date: endDate as string,
        };
      }

      const weeklyPerformance = await getBrokerWeeklyPerformanceMetrics(
        brokerId,
        companyId,
        filter,
      );

      res.json(weeklyPerformance);
    } catch (error) {
      console.error("Erro ao buscar performance semanal:", error);
      res.status(500).json({ message: "Falha ao buscar performance semanal" });
    }
  });

  // Rota para sincronizar dados do Kommo manualmente
  app.post("/api/brokers/:id/sync-kommo", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const brokerId = parseInt(req.params.id);

      // Importar a função de sincronização diretamente para evitar problemas de importação circular
      const { syncKommoMessagesToDatabase } = await import("./supabase");

      await syncKommoMessagesToDatabase(brokerId, companyId);
      res.json({ message: "Dados do Kommo sincronizados com sucesso" });
    } catch (error) {
      console.error("Erro ao sincronizar dados do Kommo:", error);
      res.status(500).json({ message: "Falha ao sincronizar dados do Kommo" });
    }
  });

  // Rota para obter retrospectiva mensal
  app.get("/api/retrospective/:year/:month", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Ano ou mês inválido" });
      }

      const retrospective = await getMonthlyRetrospective(
        companyId,
        year,
        month,
      );
      res.json(retrospective);
    } catch (error) {
      console.error("Erro ao buscar retrospectiva mensal:", error);
      res.status(500).json({ message: "Falha ao buscar retrospectiva mensal" });
    }
  });

  // Rota para obter histórico de vencedores
  app.get("/api/retrospective/winners-history", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const limite = parseInt(req.query.limite as string) || 12;

      const history = await getMonthlyWinnersHistory(companyId, limite);
      res.json(history);
    } catch (error) {
      console.error("Erro ao buscar histórico de vencedores:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar histórico de vencedores" });
    }
  });

  // Rota para processar retrospectivas mensais (pode ser chamada por cron job)
  app.post("/api/retrospective/process-monthly", async (req, res) => {
    try {
      await processMonthlyRetrospectives();
      res.json({ message: "Retrospectivas mensais processadas com sucesso" });
    } catch (error) {
      console.error("Erro ao processar retrospectivas mensais:", error);
      res
        .status(500)
        .json({ message: "Falha ao processar retrospectivas mensais" });
    }
  });

  // Rota para salvar retrospectiva de um mês específico
  app.post("/api/retrospective/save/:year/:month", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Ano ou mês inválido" });
      }

      const result = await saveMonthlyRetrospective(companyId, year, month);
      if (result) {
        res.json({ message: "Retrospectiva salva com sucesso", data: result });
      } else {
        res.status(500).json({ message: "Falha ao salvar retrospectiva" });
      }
    } catch (error) {
      console.error("Erro ao salvar retrospectiva mensal:", error);
      res.status(500).json({ message: "Falha ao salvar retrospectiva mensal" });
    }
  });

  // Rota para servir a página de retrospectiva
  app.get("/ranking/retrospective", (req, res) => {
    res.sendFile("index.html", { root: "dist" });
  });

  // Rota para servir a página de configuração de filtros
  app.get("/ranking/filters", (req, res) => {
    res.sendFile("index.html", { root: "dist" });
  });

  // Rotas para gerenciar filtros de componentes
  app.get("/api/component-filters", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const filters = await getComponentFilters(companyId);
      res.json(filters);
    } catch (error) {
      console.error("Erro ao buscar filtros:", error);
      res.status(500).json({ message: "Erro ao buscar filtros" });
    }
  });

  app.post("/api/component-filters/:componentName", async (req, res) => {
    try {
      const { componentName } = req.params;
      const companyId = (req as any).companyId;
      const filterData = req.body;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }

      // Handle both month filter and period filter
      let upsertData: any = {
        company_id: companyId,
        component_name: componentName,
        updated_at: new Date().toISOString(),
      };

      if (filterData.month && filterData.year) {
        // Month filter format
        upsertData.filter_type = "month";
        upsertData.month = filterData.month;
        upsertData.year = filterData.year;
        upsertData.start_date = null;
        upsertData.end_date = null;
      } else {
        // Period filter format
        upsertData.filter_type = filterData.filter_type;
        upsertData.start_date = filterData.start_date || null;
        upsertData.end_date = filterData.end_date || null;
        upsertData.month = null;
        upsertData.year = null;
      }

      const { error } = await supabase
        .from("component_filters")
        .upsert(upsertData, {
          onConflict: "company_id,component_name",
        });

      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving component filter:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/component-filters/:id", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const filterId = parseInt(req.params.id);
      const filterData = req.body;
      const filter = await updateComponentFilter(
        companyId,
        filterId,
        filterData,
      );
      res.json(filter);
    } catch (error) {
      console.error("Erro ao atualizar filtro:", error);
      res.status(500).json({ message: "Erro ao atualizar filtro" });
    }
  });

  app.get("/api/component-filters/:componentName", async (req, res) => {
    try {
      const { componentName } = req.params;
      const companyId = (req as any).companyId;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }

      const { data, error } = await supabase
        .from("component_filters")
        .select("*")
        .eq("company_id", companyId)
        .eq("component_name", componentName)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Return the filter data in the appropriate format
      if (data && data.filter_type === "month" && data.month && data.year) {
        res.json({ month: data.month, year: data.year });
      } else {
        res.json(data || null);
      }
    } catch (error) {
      console.error("Error fetching component filter:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Rota para obter métricas do dashboard
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const { filter_type, start_date, end_date, month, year } = req.query;

      let startDate: string, endDate: string;

      // Se mês e ano foram fornecidos, usar eles diretamente
      if (month && year) {
        const targetMonth = parseInt(month as string);
        const targetYear = parseInt(year as string);

        const periodStart = new Date(targetYear, targetMonth - 1, 1);
        const periodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        startDate = periodStart.toISOString();
        endDate = periodEnd.toISOString();

        console.log(`Dashboard metrics para ${targetMonth}/${targetYear} - Período: ${startDate} até ${endDate}`);
      } else {
        // Usar filtro de período normal
        const { start, end } = getDateRange(
          filter_type as string,
          start_date as string,
          end_date as string,
        );

        startDate = start.toISOString();
        endDate = end.toISOString();
      }

      // Buscar métricas baseadas em leads que ENTRARAM no período selecionado
      const [totalLeads, activeBrokers, maxPoints, totalSales] =
        await Promise.all([
          getTotalLeads(companyId, undefined, startDate, endDate),
          getActiveBrokers(companyId),
          getMaxPoints(companyId, startDate, endDate),
          getTotalSales(companyId, undefined, startDate, endDate),
        ]);

      console.log(
        `Métricas do dashboard - Total leads: ${totalLeads}, Corretores ativos: ${activeBrokers}, Max pontos: ${maxPoints}, Total vendas: ${totalSales}`,
      );

      res.json({
        totalLeads,
        activeBrokers,
        maxPoints,
        totalSales,
      });
    } catch (error) {
      console.error("Erro ao buscar métricas do dashboard:", error);
      res
        .status(500)
        .json({ message: "Falha ao buscar métricas do dashboard" });
    }
  });

  // Lead analysis by stage
  app.get("/api/dashboard/leads-by-stage", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const analysis = await getLeadsByStageCurrentMonth(companyId);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching leads by stage:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Monthly comparison
  app.get("/api/dashboard/monthly-comparison", async (req, res) => {
    try {
      const companyId = (req as any).companyId;
      const comparison = await getMonthlyComparison(companyId);
      res.json(comparison);
    } catch (error) {
      console.error("Error fetching monthly comparison:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Company branding routes
  app.get("/api/company-branding", getCompanyBranding);
  app.put("/api/company-branding", updateCompanyBranding);

  // Sales routes
  app.get("/api/sales/recent", async (req, res) => {
    const { getRecentSales } = await import("./routes/sales");
    return getRecentSales(req, res);
  });

  const httpServer = createServer(app);
  return httpServer;
}
