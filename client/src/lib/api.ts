import { apiRequest } from "./queryClient";
import { getServerBaseUrl } from "./utils";

export async function getBrokerRankings(filter?: {
  filter_type?: string;
  month?: string;
  year?: string;
}) {
  const params = new URLSearchParams();

  if (filter?.month) {
    params.append("month", filter.month);
  }
  if (filter?.year) {
    params.append("year", filter.year);
  }

  const url = `/api/brokers/rankings${params.toString() ? `?${params.toString()}` : ""}`;
  console.log("Fetching brokers rankings from:", url);

  return apiRequest(url);
}

export async function getBrokerById(id: number) {
  return apiRequest(`/api/brokers/${id}`, "GET");
}

// export async function getTotalLeadsBroker() {
//   return apiRequest(`/api/brokers/${id}/leads/count`, "GET");
// }

export async function getBrokerRankPosition(id: number) {
  const response = await apiRequest<{ position: number }>(
    `/api/brokers/${id}/rank-position`,
    "GET",
  );
  return response.position;
}

export async function getBrokerPoints(brokerId: number, filter?: any) {
  let url = `/api/brokers/${brokerId}/points`;
  if (filter) {
    const params = new URLSearchParams();
    params.set("filterType", filter.filter_type);
    if (filter.start_date) params.set("startDate", filter.start_date);
    if (filter.end_date) params.set("endDate", filter.end_date);
    url += `?${params.toString()}`;
  }

  const response = await fetch(getServerBaseUrl() + url);
  if (!response.ok) {
    throw new Error("Erro ao buscar pontuação do corretor");
  }
  return response.json();
}

export async function getCompanyId(): Promise<string> {
  // This should ideally come from your authentication/context
  // For now, using the hardcoded value from the middleware
  return "4f114478-6405-4971-9344-01f647c6edb8";
}

export async function getBrokerLeads(id: number) {
  return apiRequest(`/api/brokers/${id}/leads`, "GET");
}

export async function getBrokerActivities(id: number) {
  return apiRequest(`/api/brokers/${id}/activities`, "GET");
}

// Analytics related queries
export async function getBrokerPerformance(brokerId: number) {
  return apiRequest(`/api/brokers/${brokerId}/performance`, "GET");
}

export async function getActivityHeatmap(
  brokerId?: string,
  filter?: PeriodFilterData,
) {
  let url = brokerId
    ? `${getServerBaseUrl()}/api/activity-heatmap/${brokerId}`
    : `${getServerBaseUrl()}/api/activity-heatmap`;

  if (filter) {
    const params = new URLSearchParams();
    params.append("filter_type", filter.filter_type);
    if (filter.start_date) params.append("start_date", filter.start_date);
    if (filter.end_date) params.append("end_date", filter.end_date);
    url += `?${params.toString()}`;
  }

  return apiRequest(url);
}

export async function getWeeklyActivityHeatmap(brokerId: number, filter?: any) {
  let url = `/api/brokers/${brokerId}/weekly-heatmap`;
  if (filter) {
    const params = new URLSearchParams();
    params.set("filterType", filter.filter_type);
    if (filter.start_date) params.set("startDate", filter.start_date);
    if (filter.end_date) params.set("endDate", filter.end_date);
    url += `?${params.toString()}`;
  }

  const response = await fetch(getServerBaseUrl() + url);
  if (!response.ok) {
    throw new Error("Erro ao buscar heatmap de atividades");
  }
  return response.json();
}

export async function getBrokerWeeklyPerformance(
  brokerId: number,
  filter?: any,
) {
  let url = `/api/brokers/${brokerId}/weekly-performance`;
  if (filter) {
    const params = new URLSearchParams();
    params.set("filterType", filter.filter_type);
    if (filter.start_date) params.set("startDate", filter.start_date);
    if (filter.end_date) params.set("endDate", filter.end_date);
    url += `?${params.toString()}`;
  }

  const response = await fetch(getServerBaseUrl() + url);
  if (!response.ok) {
    throw new Error("Erro ao buscar performance semanal");
  }
  return response.json();
}

export async function getBrokerAlerts(brokerId: number) {
  return apiRequest(`/api/brokers/${brokerId}/alerts`, "GET");
}

export async function syncBrokerKommoData(brokerId: number) {
  return apiRequest(`/api/brokers/${brokerId}/sync-kommo`, "POST");
}

export async function getDashboardMetrics(filter?: any) {
  const params = new URLSearchParams();

  if (filter?.filter_type) {
    params.append("filter_type", filter.filter_type);
  }
  if (filter?.start_date) {
    params.append("start_date", filter.start_date);
  }
  if (filter?.end_date) {
    params.append("end_date", filter.end_date);
  }

  return apiRequest(`/api/dashboard/metrics?${params}`);
}

export async function getBrokerLeadEtapaCounts(brokerId: number, filter?: any) {
  let url = `/api/brokers/${brokerId}/etapas`;
  if (filter) {
    const params = new URLSearchParams();
    params.set("filterType", filter.filter_type);
    if (filter.start_date) params.set("startDate", filter.start_date);
    if (filter.end_date) params.set("endDate", filter.end_date);
    url += `?${params.toString()}`;
  }

  const response = await fetch(getServerBaseUrl() + url);
  if (!response.ok) {
    throw new Error("Erro ao buscar contagem de etapas");
  }
  return response.json();
}

// Leads analysis by stage
export async function getLeadsByStage() {
  return apiRequest("/api/dashboard/leads-by-stage", "GET");
}

// Monthly comparison
export async function getMonthlyComparison() {
  return apiRequest("/api/dashboard/monthly-comparison", "GET");
}

export async function getBrokerLostLeads(brokerId: number, filter?: any) {
  let url = `/api/brokers/${brokerId}/lost-leads`;
  if (filter) {
    const params = new URLSearchParams();
    params.set("filterType", filter.filter_type);
    if (filter.start_date) params.set("startDate", filter.start_date);
    if (filter.end_date) params.set("endDate", filter.end_date);
    url += `?${params.toString()}`;
  }

  const response = await fetch(getServerBaseUrl() + url);
  if (!response.ok) {
    throw new Error("Erro ao buscar leads perdidos");
  }
  return response.json();
}

export async function getPipelineConfig() {
  return apiRequest("/api/companies/pipeline-config", "GET");
}

export async function getBrokerInactivityTime(brokerId: number) {
  const response = await fetch(
    getServerBaseUrl() + `/api/brokers/${brokerId}/inactivity-time`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch broker inactivity time");
  }
  return response.json();
}

export async function getBrokerTotalLeadsLastMonth(brokerId: number) {
  const response = await fetch(
    getServerBaseUrl() + `/api/brokers/${brokerId}/total-leads-last-month`,
  );

  if (!response.ok) {
    throw new Error(`Erro ao buscar total de leads: ${response.statusText}`);
  }

  return response.json();
}

export async function getAllBrokersTotalLeadsLastMonth() {
  return apiRequest(`/api/brokers/total-leads-last-month`, "GET");
}
