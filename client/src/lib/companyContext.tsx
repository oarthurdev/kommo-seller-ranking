import React, { createContext, useContext, useEffect, useState } from "react";
import { CompanyNotFound } from "@/pages/CompanyNotFound";
import { getServerBaseUrl } from "./utils";

interface CompanyContextType {
  companyId: string | null;
  isLoading: boolean;
  hasError: boolean;
  subdomain?: string;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companyState, setCompanyState] = useState<CompanyContextType>({
    companyId: null,
    isLoading: true,
    hasError: false,
  });

  useEffect(() => {
    async function checkCompanyStatus() {
      try {
        // Fazer uma requisição para verificar se a empresa existe
        const response = await fetch(
          getServerBaseUrl() + "/api/company-status",
        );

        if (response.status === 404) {
          // Empresa não encontrada
          const data = await response.json().catch(() => ({}));
          setCompanyState({
            companyId: null,
            isLoading: false,
            hasError: true,
            subdomain: data.subdomain || getSubdomain(),
          });
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setCompanyState({
            companyId: data.companyId,
            isLoading: false,
            hasError: false,
          });
        } else {
          throw new Error("Failed to check company status");
        }
      } catch (error) {
        console.error("Error checking company status:", error);
        setCompanyState({
          companyId: null,
          isLoading: false,
          hasError: true,
          subdomain: getSubdomain(),
        });
      }
    }

    checkCompanyStatus();
  }, []);

  function getSubdomain(): string {
    if (typeof window === "undefined") return "";

    const hostname = window.location.hostname;
    return hostname.split(".")[0];
  }

  // Se ainda está carregando
  if (companyState.isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se houve erro (empresa não encontrada)
  if (companyState.hasError) {
    return <CompanyNotFound subdomain={companyState.subdomain} />;
  }

  // Se tudo está ok, renderiza o app normalmente
  return (
    <CompanyContext.Provider value={companyState}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
