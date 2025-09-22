import React, { useState, useEffect } from "react";
import { Calendar, Clock, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUnifiedFilter } from "@/lib/unifiedFilterContext";

export interface PeriodFilterData {
  filter_type: string;
  start_date?: string;
  end_date?: string;
  month?: number;
  year?: number;
}

interface PeriodFilterProps {
  componentName: string;
  onFilterChange: (filter: PeriodFilterData) => void;
  className?: string;
  compact?: boolean;
}

const FILTER_OPTIONS = [
  { value: "7_days", label: "Últimos 7 dias" },
  { value: "30_days", label: "Últimos 30 dias" },
  { value: "current_week", label: "Semana Atual" },
  { value: "current_month", label: "Mês Atual" },
  { value: "last_month", label: "Mês Passado" },
  { value: "custom_range", label: "Período Personalizado" },
  { value: "month", label: "Filtro por Mês/Ano (Global)" },
];

export function PeriodFilter({
  componentName,
  onFilterChange,
  className = "",
  compact = false,
}: PeriodFilterProps) {
  const { currentFilter, updateComponentFilter, getComponentFilter } = useUnifiedFilter();
  const [filterType, setFilterType] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Definir opções específicas para o heatmap
  const heatmapFilterOptions = [
    { value: "7_days", label: "Últimos 7 dias" },
    { value: "30_days", label: "Últimos 30 dias" },
    { value: "current_week", label: "Semana atual" },
    { value: "current_month", label: "Mês atual" },
    { value: "custom_range", label: "Período personalizado" },
  ];

  const generalFilterOptions = [
    { value: "7_days", label: "Últimos 7 dias" },
    { value: "30_days", label: "Últimos 30 dias" },
    { value: "current_week", label: "Semana atual" },
    { value: "current_month", label: "Mês atual" },
    { value: "last_month", label: "Mês passado" },
    { value: "month", label: "Mês específico" },
    { value: "custom_range", label: "Período personalizado" },
  ];

  // Usar opções específicas para heatmap ou opções gerais para outros componentes
  const filterOptions = componentName === "broker_heatmap" ? heatmapFilterOptions : generalFilterOptions;

  // Load existing filter for this component
  useEffect(() => {
    const loadExistingFilter = async () => {
      try {
        const filter = await getComponentFilter(componentName);
        if (filter) {
          const newFilterType = filter.filter_type;
          const newStartDate = filter.start_date
            ? filter.start_date.split("T")[0]
            : "";
          const newEndDate = filter.end_date
            ? filter.end_date.split("T")[0]
            : "";

          setFilterType(newFilterType);
          setStartDate(newStartDate);
          setEndDate(newEndDate);

          // If using global filter, apply current global values
          if (newFilterType === "month") {
            onFilterChange({
              filter_type: "month",
              month: currentFilter.month,
              year: currentFilter.year,
            });
          } else {
            onFilterChange({
              filter_type: newFilterType,
              start_date: newStartDate || undefined,
              end_date: newEndDate || undefined,
            });
          }
        } else {
          // Default to global filter
          onFilterChange({
            filter_type: "month",
            month: currentFilter.month,
            year: currentFilter.year,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar filtro:", error);
      }
    };

    loadExistingFilter();
  }, [componentName, currentFilter.month, currentFilter.year]);

  // Update when global filter changes
  useEffect(() => {
    if (filterType === "month") {
      onFilterChange({
        filter_type: "month",
        month: currentFilter.month,
        year: currentFilter.year,
      });
    }
  }, [currentFilter, filterType]);

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value);

    if (value === "month") {
      applyFilter(value, "", "", currentFilter.month, currentFilter.year);
    } else if (value !== "custom_range") {
      applyFilter(value, "", "");
    }
  };

  const handleCustomDateChange = () => {
    if (filterType === "custom_range" && startDate && endDate) {
      applyFilter(filterType, startDate, endDate);
    }
  };

  const applyFilter = async (
    type: string,
    start?: string,
    end?: string,
    month?: number,
    year?: number
  ) => {
    setIsLoading(true);

    try {
      const filterData: PeriodFilterData = {
        filter_type: type,
        start_date: start || undefined,
        end_date: end || undefined,
        month: month || undefined,
        year: year || undefined,
      };

      // Save to backend
      await updateComponentFilter(componentName, filterData);

      // Notify parent component
      onFilterChange(filterData);

      // Update local state
      setFilterType(type);
      if (type === "custom_range") {
        setStartDate(start || "");
        setEndDate(end || "");
      }
    } catch (error) {
      console.error("Erro ao aplicar filtro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentFilterLabel = () => {
    if (filterType === "month") {
      return `${currentFilter.month}/${currentFilter.year}`;
    }

    const option = filterOptions.find(opt => opt.value === filterType);
    return option?.label || filterType;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Filter className="w-4 h-4 text-gray-400" />
        <Select value={filterType} onValueChange={handleFilterTypeChange}>
          <SelectTrigger className="w-64 h-8 bg-gray-800/50 border-gray-600 text-white text-sm">
            <SelectValue>
              Filtro: {getCurrentFilterLabel()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterType === "custom_range" && (
          <>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-32 h-8 bg-gray-800/50 border-gray-600 text-white text-sm"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-32 h-8 bg-gray-800/50 border-gray-600 text-white text-sm"
            />
            <Button
              onClick={handleCustomDateChange}
              size="sm"
              disabled={isLoading || !startDate || !endDate}
              className="h-8 px-3"
            >
              Aplicar
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-4 bg-gray-800/50 border-gray-700 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-blue-400" />
        <Label className="text-sm font-medium text-white">
          Período de Exibição
        </Label>
      </div>

      <div className="space-y-3">
        <Select value={filterType} onValueChange={handleFilterTypeChange}>
          <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
            <SelectValue>
              {getCurrentFilterLabel()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterType === "custom_range" && (
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">
                Data Inicial
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">
                Data Final
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white"
              />
            </div>
            <Button
              onClick={handleCustomDateChange}
              className="w-full"
              disabled={isLoading || !startDate || !endDate}
            >
              {isLoading ? "Aplicando..." : "Aplicar Período"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}