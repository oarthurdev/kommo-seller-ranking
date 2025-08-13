import React, { useState, useEffect } from "react";
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

export function MonthFilter({
  componentName,
  onFilterChange,
  compact = false,
  className = "",
}: MonthFilterProps) {
  const { currentFilter, setGlobalFilter, updateComponentFilter } =
    useUnifiedFilter();
  const [selectedMonth, setSelectedMonth] = useState(
    currentFilter.month || new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(
    currentFilter.year || new Date().getFullYear(),
  );

  // Generate years (current year + 2 previous years)
  const currentDate = new Date();
  const years = [];
  for (let i = 2; i >= 0; i--) {
    years.push(currentDate.getFullYear() - i);
  }

  // Sync with global filter
  useEffect(() => {
    if (currentFilter.month && currentFilter.year) {
      setSelectedMonth(currentFilter.month);
      setSelectedYear(currentFilter.year);
      onFilterChange({ month: currentFilter.month, year: currentFilter.year });
    }
  }, [currentFilter.month, currentFilter.year]);

  const handleFilterChange = async (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    const filterData = {
      filter_type: "month",
      month,
      year,
    };

    // Update global filter (this will propagate to all components)
    setGlobalFilter(filterData);

    // Notify parent component
    onFilterChange({ month, year });
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
