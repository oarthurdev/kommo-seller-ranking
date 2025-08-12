
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  updateComponentFilter: (componentName: string, filter: UnifiedFilterData) => Promise<void>;
  getComponentFilter: (componentName: string) => Promise<UnifiedFilterData | null>;
}

const UnifiedFilterContext = createContext<UnifiedFilterContextType | null>(null);

export function UnifiedFilterProvider({ children }: { children: React.ReactNode }) {
  const currentDate = new Date();
  const [currentFilter, setCurrentFilter] = useState<UnifiedFilterData>({
    filter_type: "month_year",
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });

  // Load initial filter from ranking component
  useEffect(() => {
    const loadInitialFilter = async () => {
      try {
        const response = await fetch(
          getServerBaseUrl() + `/api/component-filters/ranking_metrics`,
        );
        if (response.ok) {
          const filter = await response.json();
          if (filter && filter.month && filter.year) {
            setCurrentFilter({
              filter_type: "month_year",
              month: filter.month,
              year: filter.year,
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar filtro inicial:", error);
      }
    };

    loadInitialFilter();
  }, []);

  const setGlobalFilter = useCallback(async (filter: UnifiedFilterData) => {
    setCurrentFilter(filter);
    
    // Update all component filters to follow the global filter
    const components = [
      "ranking_metrics",
      "broker_performance_metrics", 
      "broker_heatmap",
      "sales_funnel",
      "lost_leads_funnel"
    ];

    for (const componentName of components) {
      await updateComponentFilter(componentName, filter);
    }
  }, []);

  const updateComponentFilter = useCallback(async (componentName: string, filter: UnifiedFilterData) => {
    try {
      await fetch(getServerBaseUrl() + `/api/component-filters/${componentName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          component_name: componentName,
          ...filter,
        }),
      });
    } catch (error) {
      console.error(`Erro ao salvar filtro para ${componentName}:`, error);
    }
  }, []);

  const getComponentFilter = useCallback(async (componentName: string): Promise<UnifiedFilterData | null> => {
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
  }, []);

  return (
    <UnifiedFilterContext.Provider
      value={{
        currentFilter,
        setGlobalFilter,
        updateComponentFilter,
        getComponentFilter,
      }}
    >
      {children}
    </UnifiedFilterContext.Provider>
  );
}

export function useUnifiedFilter() {
  const context = useContext(UnifiedFilterContext);
  if (!context) {
    throw new Error("useUnifiedFilter must be used within UnifiedFilterProvider");
  }
  return context;
}
