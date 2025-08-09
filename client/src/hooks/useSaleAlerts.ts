import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getServerBaseUrl } from "@/lib/utils";

interface SaleActivity {
  id: string;
  lead_id: number;
  user_id: number;
  valor_novo: string | object;
  criado_em: string;
  brokers?: {
    nome: string;
    cargo: string;
  };
}

export function useSaleAlerts() {
  const lastCheckedRef = useRef<Date>(
    new Date(new Date().getTime() - 3 * 60 * 60 * 1000),
  );

  const getShownSales = (): Set<string> => {
    try {
      const stored = localStorage.getItem("shownSales");
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Erro ao carregar vendas exibidas:", error);
    }
    return new Set();
  };

  const [shownSales, setShownSales] = useState<Set<string>>(getShownSales);
  const { toast } = useToast();

  const checkForNewSales = async () => {
    try {
      const lastCheckedGMT3 = new Date(
        lastCheckedRef.current.getTime() - 3 * 60 * 60 * 1000,
      );

      const response = await fetch(
        getServerBaseUrl() +
          `/api/sales/recent?since=${lastCheckedGMT3.toISOString()}`,
      );

      if (!response.ok) {
        console.error("Erro ao buscar novas vendas:", response.statusText);
        return;
      }

      const data: SaleActivity[] = await response.json();

      if (data && data.length > 0) {
        const mostRecentSale = data.find((activity) => {
          try {
            if (activity.brokers?.cargo !== "Corretor") return false;

            let valorNovo;

            if (typeof activity.valor_novo === "string") {
              const fixedJson = activity.valor_novo.replace(/'/g, '"');
              valorNovo = JSON.parse(fixedJson);
            } else if (
              typeof activity.valor_novo === "object" &&
              activity.valor_novo !== null
            ) {
              valorNovo = activity.valor_novo;
            } else {
              return false;
            }

            if (Array.isArray(valorNovo)) {
              return valorNovo.some((item) => {
                const leadStatus = item?.lead_status;
                const statusId = leadStatus?.id ?? leadStatus;
                return statusId === 142 || statusId === "142";
              });
            }

            const leadStatus = valorNovo?.lead_status;
            const statusId = leadStatus?.id ?? leadStatus;
            return statusId === 142 || statusId === "142";
          } catch (e) {
            console.warn("Erro ao parsear valor_novo:", e);
            return false;
          }
        });

        if (mostRecentSale && !shownSales.has(mostRecentSale.id)) {
          // Atualizar o estado primeiro
          setShownSales((prevShownSales) => {
            const newShownSales = new Set(prevShownSales);
            newShownSales.add(mostRecentSale.id);

            // Salvar no localStorage
            try {
              localStorage.setItem(
                "shownSales",
                JSON.stringify([...newShownSales]),
              );
            } catch (error) {
              console.warn("Erro ao salvar vendas exibidas:", error);
            }

            return newShownSales;
          });

          // Mostrar o toast imediatamente
          toast({
            title: "🎉 Nova Venda Realizada!",
            description: `${mostRecentSale.brokers?.nome || "Corretor"} fechou o Lead #${mostRecentSale.lead_id}`,
            duration: 8000,
            className:
              "bg-gradient-to-br from-green-900/90 to-emerald-800/90 border-green-500/30 text-white",
          });
        } else if (!mostRecentSale) {
          console.log(
            "Nenhuma nova venda com status 142 e cargo 'Corretor' encontrada.",
          );
        }
      }

      lastCheckedRef.current = new Date(
        new Date().getTime() - 3 * 60 * 60 * 1000,
      );
    } catch (error) {
      console.error("Erro ao executar checkForNewSales:", error);
    }
  };

  useEffect(() => {
    // Fetch inicial
    checkForNewSales();

    let interval: NodeJS.Timeout | null = null;
    let isPageVisible = true;
    let lastActivity = Date.now();

    // Função para verificar se deve fazer polling
    const shouldPoll = () => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      return isPageVisible && timeSinceLastActivity < 5 * 60 * 1000; // 5 minutos
    };

    // Configurar polling inteligente
    const startPolling = () => {
      if (interval) clearInterval(interval);
      
      interval = setInterval(() => {
        if (shouldPoll()) {
          checkForNewSales();
        }
      }, 60000); // Check a cada 1 minuto
    };

    // Detectar atividade do usuário
    const updateActivity = () => {
      lastActivity = Date.now();
      if (!interval && isPageVisible) {
        startPolling();
      }
    };

    // Detectar mudança de visibilidade da aba
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      
      if (isPageVisible) {
        lastActivity = Date.now();
        checkForNewSales(); // Check imediato quando volta para a aba
        startPolling();
      } else {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    };

    // Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('click', updateActivity);

    // Iniciar polling se a página está visível
    if (isPageVisible) {
      startPolling();
    }

    // Cleanup
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', updateActivity);
      document.removeEventListener('keydown', updateActivity);
      document.removeEventListener('click', updateActivity);
    };
  }, []);

  return {
    newSale: null,
    isAlertOpen: false,
    closeAlert: () => {},
  };
}