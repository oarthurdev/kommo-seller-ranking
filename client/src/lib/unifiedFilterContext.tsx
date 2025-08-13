import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getServerBaseUrl } from "@/lib/utils";

export interface UnifiedFilterData {
  filter_type: string;
  month?: number;
  year?: number;
  start_date?: string;
  end_date?: string;
}

interface UnifiedFilterContextType {
  currentFilter: UnifiedFilterData;
  setGlobalFilter: (filter: UnifiedFilterData) => void;
  updateComponentFilter: (
    componentName: string,
    filter: UnifiedFilterData,
  ) => Promise<void>;
  getComponentFilter: (
    componentName: string,
  ) => Promise<UnifiedFilterData | null>;
  getGlobalFilter: () => UnifiedFilterData;
  propagateGlobalFilterToComponents: (
    baseFilter?: UnifiedFilterData,
  ) => Promise<void>;
  // 👇
  isHydrated: boolean;
}

const UnifiedFilterContext = createContext<UnifiedFilterContextType | null>(
  null,
);

export function UnifiedFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const now = new Date();

  // Valor default NÃO deve causar salvamento; é só placeholder visual
  const [currentFilter, setCurrentFilter] = useState<UnifiedFilterData>({
    filter_type: "month",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadInitialFilter = async () => {
      try {
        const res = await fetch(
          getServerBaseUrl() + `/api/component-filters/ranking_metrics`,
        );
        if (res.ok) {
          const filter = await res.json();
          if (filter && (filter.month || filter.filter_type)) {
            const globalFilter: UnifiedFilterData =
              filter.filter_type === "month" && filter.month && filter.year
                ? {
                    filter_type: "month",
                    month: filter.month,
                    year: filter.year,
                  }
                : {
                    filter_type: filter.filter_type || "current_month",
                    start_date: filter.start_date,
                    end_date: filter.end_date,
                  };
            setCurrentFilter(globalFilter);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar filtro inicial:", e);
      } finally {
        // ✅ SINALIZA que o valor inicial (persistido) já foi considerado
        setIsHydrated(true);
      }
    };
    loadInitialFilter();
  }, []);

  /**
   * Sempre envia month/year do globalFilter (currentFilter),
   * independentemente do que vier no `filter` passado.
   */
  const updateComponentFilter = useCallback(
    async (componentName: string, filter: UnifiedFilterData) => {
      try {
        const resolvedMonth =
          typeof filter.month === "number" ? filter.month : currentFilter.month;
        const resolvedYear =
          typeof filter.year === "number" ? filter.year : currentFilter.year;

        await fetch(
          getServerBaseUrl() + `/api/component-filters/${componentName}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              component_name: componentName,
              ...filter,
              month: resolvedMonth,
              year: resolvedYear,
            }),
          },
        );
      } catch (error) {
        console.error(`Erro ao salvar filtro para ${componentName}:`, error);
      }
    },
    [currentFilter.month, currentFilter.year],
  );

  /**
   * Propaga o filtro global para os componentes da página do corretor.
   * Aceita um filtro base opcional para evitar race entre setState e POST.
   */
  const propagateGlobalFilterToComponents = useCallback(
    async (baseFilter?: UnifiedFilterData) => {
      const brokerComponents = [
        "broker_performance_metrics",
        "broker_heatmap",
        "sales_funnel",
        "lost_leads_funnel",
      ];

      const toPropagate = baseFilter ?? currentFilter;

      for (const componentName of brokerComponents) {
        await updateComponentFilter(componentName, toPropagate);
      }
    },
    [currentFilter, updateComponentFilter],
  );

  /**
   * Troca o filtro global e garante que month/year usados nos POSTs
   * sejam os do novo globalFilter.
   */
  const setGlobalFilter = useCallback(
    async (filter: UnifiedFilterData) => {
      // Normaliza o novo global (garante month/year quando for filtro mensal)
      const nextGlobal: UnifiedFilterData =
        filter.filter_type === "month"
          ? {
              filter_type: "month",
              month: filter.month ?? currentFilter.month,
              year: filter.year ?? currentFilter.year,
            }
          : { ...filter };

      setCurrentFilter(nextGlobal);

      // Atualiza o filtro "global" do ranking
      await updateComponentFilter("ranking_metrics", nextGlobal);

      // Propaga já usando o nextGlobal (evita depender do setState assíncrono)
      await propagateGlobalFilterToComponents(nextGlobal);
    },
    [
      currentFilter.month,
      currentFilter.year,
      updateComponentFilter,
      propagateGlobalFilterToComponents,
    ],
  );

  const getComponentFilter = useCallback(
    async (componentName: string): Promise<UnifiedFilterData | null> => {
      try {
        const response = await fetch(
          getServerBaseUrl() + `/api/component-filters/${componentName}`,
        );
        if (response.ok) {
          const filter = await response.json();
          return filter || null;
        }
      } catch (error) {
        console.error(`Erro ao buscar filtro para ${componentName}:`, error);
      }
      return null;
    },
    [],
  );

  const getGlobalFilter = useCallback(() => currentFilter, [currentFilter]);

  return (
    <UnifiedFilterContext.Provider
      value={{
        currentFilter,
        setGlobalFilter,
        updateComponentFilter,
        getComponentFilter,
        getGlobalFilter,
        propagateGlobalFilterToComponents,
        // 👇 expõe para os componentes
        isHydrated,
      }}
    >
      {children}
    </UnifiedFilterContext.Provider>
  );
}

export function useUnifiedFilter() {
  const context = useContext(UnifiedFilterContext);
  if (!context) {
    throw new Error(
      "useUnifiedFilter must be used within UnifiedFilterProvider",
    );
  }
  return context;
}
