import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useCompanyIdFromPath } from "./useCompanyIdFromPath";

export function useBrokerRankings() {
  const companyId = useCompanyIdFromPath();

  return useQuery({
    queryKey: ["brokerRankings", companyId],
    queryFn: () => apiRequest(`/api/brokers/rankings?companyId=${companyId}`),
    enabled: !!companyId,
  });
}
