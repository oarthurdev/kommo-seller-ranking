import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { RankingPage } from "@/pages/RankingPage";
import { BrokerProfilePage } from "@/pages/BrokerProfilePage";
import { MonthlyRetrospectivePage } from "@/pages/MonthlyRetrospectivePage";
import { FilterConfigPage } from "@/pages/FilterConfigPage";
import { NotFound } from "@/pages/not-found";
import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { BrandingProvider } from "@/lib/brandingContext";
import { CompanyProvider } from "@/lib/companyContext";
import React, { useState, useEffect, useCallback } from "react";
import { ROTATION_INTERVAL } from "@/lib/constants";

// Componente para rotação automática de páginas
function AutoRotation() {
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(0);
  const [topBrokerIds, setTopBrokerIds] = useState<number[]>([]);
  const [progress, setProgress] = useState(0); // Estado para controlar o progresso

  // Carregar os IDs dos principais corretores
  useEffect(() => {
    async function fetchTopBrokers() {
      try {
        const data = await import("@/lib/api").then((m) =>
          m.getBrokerRankings(),
        );

        // Pegar os IDs dos 3 principais corretores
        if (data) {
          setTopBrokerIds(data.map((broker: { id: any }) => broker.id));
        }
      } catch (error) {
        console.error("Erro ao buscar corretores:", error);
      }
    }

    fetchTopBrokers();
  }, []);

  // Calcular número total de páginas (ranking + perfis dos 3 principais corretores)
  const totalPages =
    1 + (topBrokerIds && topBrokerIds.length ? topBrokerIds.length : 0);

  // Função para navegar para a próxima página
  const goToNextPage = useCallback(() => {
    const nextPage = (currentPage + 1) % totalPages;
    setCurrentPage(nextPage);

    if (nextPage === 0) {
      // Voltar para a página de ranking
      setLocation("/ranking");
    } else {
      // Ir para o perfil de um corretor específico
      const brokerId = topBrokerIds[nextPage - 1];
      if (brokerId) {
        setLocation(`/ranking/broker/${brokerId}`);
      }
    }
  }, [currentPage, totalPages, topBrokerIds, setLocation]);

  // Atualizar o progresso e realizar a rotação
  useEffect(() => {
    if (totalPages <= 1) return; // Não rotar se só tiver uma página

    const interval = 100; // Intervalo de atualização do progresso em milissegundos
    let currentProgress = 0;

    const progressInterval = setInterval(() => {
      currentProgress += 100 / (ROTATION_INTERVAL / interval);
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        goToNextPage();
        currentProgress = 0;
        setProgress(0);
      }
    }, interval);

    // Limpar intervalo ao desmontar ou ao trocar de página
    return () => clearInterval(progressInterval);
  }, [goToNextPage, totalPages]);

  return null; // Este componente não renderiza nada, apenas gerencia a navegação
}

function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const newProgress = (elapsedTime / ROTATION_INTERVAL) * 100;

      if (newProgress >= 100) {
        setProgress(0);
      } else {
        setProgress(newProgress);
      }
    }, 10);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="progress-bar"
      style={{
        width: `${progress}%`,
        opacity: 1,
      }}
    />
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 500);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <>
      <ProgressBar />
      <div
        className={`page-transition ${isTransitioning ? "opacity-50" : "opacity-100"}`}
      >
        {children}
      </div>
    </>
  );
}

function AppContent() {
  return (
    <CompanyProvider>
      <BrandingProvider>
        <div className="bg-background min-h-screen">
          {/* <PageTransition> */}
          <AutoRotation />
          <Switch>
            <Route path="/ranking" component={RankingPage} />
            <Route path="/ranking/broker/:id" component={BrokerProfilePage} />
            <Route
              path="/ranking/retrospective"
              component={MonthlyRetrospectivePage}
            />
            <Route path="/ranking/filters" component={FilterConfigPage} />
            <Route component={NotFound} />
          </Switch>
          {/* </PageTransition> */}
          <Toaster />
        </div>
      </BrandingProvider>
    </CompanyProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
