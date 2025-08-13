
export interface ComponentFilter {
  id: number;
  component_name: string;
  filter_type: string;
  start_date?: string;
  end_date?: string;
  month?: number;
  year?: number;
}

export async function getComponentFilter(componentName: string): Promise<ComponentFilter | null> {
  try {
    const res = await fetch(`/api/component-filters/${componentName}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Erro ao buscar filtro");
    }
    return res.json();
  } catch (error) {
    console.error("Erro ao buscar filtro:", error);
    return null;
  }
}

export function calculateFilterPeriod(filter: ComponentFilter | null) {
  const now = new Date();
  
  // Helper function to format date as YYYY-MM-DD HH:MM:SS for database compatibility
  const formatDateForDB = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  
  switch (filter?.filter_type) {
    case "month":
      if (filter.month && filter.year) {
        const startOfMonth = new Date(filter.year, filter.month - 1, 1);
        const endOfMonth = new Date(filter.year, filter.month, 0, 23, 59, 59, 999);
        
        return { 
          start: startOfMonth, 
          end: endOfMonth,
          startFormatted: formatDateForDB(startOfMonth),
          endFormatted: formatDateForDB(endOfMonth)
        };
      }
      break;
      
    case "7_days":
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      
      return { 
        start: sevenDaysAgo, 
        end: endOfToday,
        startFormatted: formatDateForDB(sevenDaysAgo),
        endFormatted: formatDateForDB(endOfToday)
      };
      
    case "30_days":
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      
      const endOfToday30 = new Date(now);
      endOfToday30.setHours(23, 59, 59, 999);
      
      return { 
        start: thirtyDaysAgo, 
        end: endOfToday30,
        startFormatted: formatDateForDB(thirtyDaysAgo),
        endFormatted: formatDateForDB(endOfToday30)
      };

    case "current_week":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return { 
        start: startOfWeek, 
        end: endOfWeek,
        startFormatted: formatDateForDB(startOfWeek),
        endFormatted: formatDateForDB(endOfWeek)
      };
      
    case "current_month":
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      return { 
        start: startOfCurrentMonth, 
        end: endOfCurrentMonth,
        startFormatted: formatDateForDB(startOfCurrentMonth),
        endFormatted: formatDateForDB(endOfCurrentMonth)
      };
      
    case "last_month":
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      return { 
        start: startOfLastMonth, 
        end: endOfLastMonth,
        startFormatted: formatDateForDB(startOfLastMonth),
        endFormatted: formatDateForDB(endOfLastMonth)
      };
      
    case "custom_range":
      if (filter.start_date && filter.end_date) {
        const start = new Date(filter.start_date);
        const end = new Date(filter.end_date + "T23:59:59.999");
        return { 
          start, 
          end,
          startFormatted: formatDateForDB(start),
          endFormatted: formatDateForDB(end)
        };
      }
      break;
  }
  
  // Default: current month
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { 
    start: defaultStart, 
    end: defaultEnd,
    startFormatted: formatDateForDB(defaultStart),
    endFormatted: formatDateForDB(defaultEnd)
  };
}

export function getFilterDescription(filter: ComponentFilter | null): string {
  switch (filter?.filter_type) {
    case "month":
      if (filter.month && filter.year) {
        const monthNames = [
          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        return `${monthNames[filter.month - 1]} ${filter.year}`;
      }
      return "Filtro por Mês/Ano";
    case "7_days":
      return "Últimos 7 dias";
    case "30_days":
      return "Últimos 30 dias";
    case "current_week":
      return "Semana Atual";
    case "current_month":
      return "Mês Atual";
    case "last_month":
      return "Mês Passado";
    case "custom_range":
      if (filter.start_date && filter.end_date) {
        const start = new Date(filter.start_date).toLocaleDateString("pt-BR");
        const end = new Date(filter.end_date).toLocaleDateString("pt-BR");
        return `${start} - ${end}`;
      }
      return "Período Personalizado";
    default:
      return "Mês Atual (padrão)";
  }
}
