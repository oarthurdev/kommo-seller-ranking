import React, { useState, useRef, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { useUnifiedFilter } from "@/lib/unifiedFilterContext";

interface MonthFilterProps {
  componentName: string;
  onFilterChange: (filter: MonthFilterData) => void;
  compact?: boolean;
  className?: string;
}

export interface MonthFilterData {
  month: number;
  year: number;
}

const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const CURRENT_YEAR = new Date().getFullYear();
// quantos anos pra trás você quer mostrar no seletor
const YEAR_RANGE = 2;

const years = Array.from(
  { length: YEAR_RANGE + 1 },
  (_, i) => CURRENT_YEAR - i,
);

export function MonthFilter({
  componentName,
  onFilterChange,
  compact = false,
  className = "",
}: MonthFilterProps) {
  const { currentFilter, setGlobalFilter, isHydrated } = useUnifiedFilter();

  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );

  // 👇 impede notificar no primeiro sync (montagem)
  const didInitRef = useRef(false);

  // Sync visual com o global, mas sem salvar nem notificar no mount
  useEffect(() => {
    if (!isHydrated) return;

    // Atualiza os selects a partir do global persistido
    if (
      currentFilter.filter_type === "month" &&
      currentFilter.month &&
      currentFilter.year
    ) {
      setSelectedMonth(currentFilter.month);
      setSelectedYear(currentFilter.year);
    }

    // Primeira hidratação: apenas refletir UI, sem disparar nada
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }

    // Mudanças futuras do global (gatilho externo) podem refletir na UI
    // mas não chamamos onFilterChange aqui para não re-salvar sem ação do usuário
  }, [
    isHydrated,
    currentFilter.filter_type,
    currentFilter.month,
    currentFilter.year,
  ]);

  // ÚNICO ponto que salva/propaga: ação do usuário
  const handleFilterChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    const next = { filter_type: "month", month, year };

    // Isso já salva `ranking_metrics` no backend e propaga para os componentes
    setGlobalFilter(next);

    // O pai pode usar esse callback apenas para invalidar queries locais, se quiser
    onFilterChange?.({ month, year });
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        value={selectedMonth.toString()}
        onValueChange={(value) =>
          handleFilterChange(parseInt(value), selectedYear)
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedYear.toString()}
        onValueChange={(value) =>
          handleFilterChange(selectedMonth, parseInt(value))
        }
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
