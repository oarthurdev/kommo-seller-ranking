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
import { getServerBaseUrl } from "@/lib/utils";

export interface PeriodFilterData {
  filter_type: string;
  start_date?: string;
  end_date?: string;
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
  { value: "custom_range", label: "Período Personalizado" },
];

export function PeriodFilter({
  componentName,
  onFilterChange,
  className = "",
  compact = false,
}: PeriodFilterProps) {
  const [filterType, setFilterType] = useState("current_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Carregar filtro existente
  useEffect(() => {
    const loadExistingFilter = async () => {
      try {
        const response = await fetch(
          getServerBaseUrl() + `/api/component-filters/${componentName}`,
        );
        if (response.ok) {
          const filter = await response.json();
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

            // Notify parent component immediately with loaded filter
            onFilterChange({
              filter_type: newFilterType,
              start_date: newStartDate || undefined,
              end_date: newEndDate || undefined,
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar filtro:", error);
      }
    };

    loadExistingFilter();
  }, [componentName]);

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value);

    if (value !== "custom_range") {
      applyFilter(value, "", "");
    }
  };

  const handleCustomDateChange = () => {
    if (filterType === "custom_range" && startDate && endDate) {
      applyFilter(filterType, startDate, endDate);
    }
  };

  const applyFilter = async (type: string, start?: string, end?: string) => {
    setIsLoading(true);

    try {
      const filterData: PeriodFilterData = {
        filter_type: type,
        start_date: start || undefined,
        end_date: end || undefined,
      };

      // Salvar no backend
      const response = await fetch(
        getServerBaseUrl() + `/api/component-filters/${componentName}`,
        {
          method: "GET",
        },
      );

      let method = "POST";
      let url = "/api/component-filters";

      if (response.ok) {
        const existingFilter = await response.json();
        if (existingFilter) {
          method = "PUT";
          url = `/api/component-filters/${existingFilter.id}`;
        }
      }

      await fetch(getServerBaseUrl() + url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          component_name: componentName,
          ...filterData,
        }),
      });

      // Notificar componente pai
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

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Filter className="w-4 h-4 text-gray-400" />
        <Select value={filterType} onValueChange={handleFilterTypeChange}>
          <SelectTrigger className="w-48 h-8 bg-gray-800/50 border-gray-600 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
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
