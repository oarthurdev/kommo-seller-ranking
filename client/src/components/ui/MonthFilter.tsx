
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { getServerBaseUrl } from "@/lib/utils";

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

export function MonthFilter({ 
  componentName, 
  onFilterChange, 
  compact = false,
  className = ""
}: MonthFilterProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Generate years (current year + 2 previous years)
  const years = [];
  for (let i = 2; i >= 0; i--) {
    years.push(currentDate.getFullYear() - i);
  }

  // Load initial filter from backend
  useEffect(() => {
    const loadInitialFilter = async () => {
      try {
        const response = await fetch(
          getServerBaseUrl() + `/api/component-filters/${componentName}`,
        );
        if (response.ok) {
          const filter = await response.json();
          if (filter && filter.month && filter.year) {
            setSelectedMonth(filter.month);
            setSelectedYear(filter.year);
            onFilterChange({ month: filter.month, year: filter.year });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar filtro inicial:", error);
      }
    };

    loadInitialFilter();
  }, [componentName, onFilterChange]);

  const handleFilterChange = async (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    const filterData = { month, year };

    try {
      // Save filter to backend
      await fetch(getServerBaseUrl() + `/api/component-filters/${componentName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filterData),
      });

      onFilterChange(filterData);
    } catch (error) {
      console.error("Erro ao salvar filtro:", error);
      // Still call onFilterChange even if saving fails
      onFilterChange(filterData);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        value={selectedMonth.toString()}
        onValueChange={(value) => handleFilterChange(parseInt(value), selectedYear)}
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
        onValueChange={(value) => handleFilterChange(selectedMonth, parseInt(value))}
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
