import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

export interface CompanyBranding {
  id: number;
  company_id: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  theme_mode?: "light" | "dark";
  dashboard_title?: string;
}

export function useCompanyBranding() {
  return useQuery({
    queryKey: ["companyBranding"],
    queryFn: () => apiRequest(`/api/company-branding`),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
