import React, { useState } from "react";

type FunnelStage = {
  name: string;
  value: number;
  count: number;
  totalValue?: number; // Total value for this stage
  isVendaGanha?: boolean; // Flag to identify if this is the "Venda Ganha" stage
};

type FunnelBarProps = {
  stages: FunnelStage[];
  totalLeads: number;
};

// Predefined color palette with distinct, well-separated colors
const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#A855F7', // Purple
  '#22C55E', // Green
  '#FACC15', // Yellow
  '#DC2626', // Red-600
  '#7C3AED', // Violet-600
  '#0891B2', // Cyan-600
  '#EA580C', // Orange-600
  '#65A30D', // Lime-600
];

const getColorForStage = (name: string, index: number, totalStages: number): string => {
  // Use index to ensure unique colors for each stage
  if (index < COLOR_PALETTE.length) {
    return COLOR_PALETTE[index];
  }
  
  // If we have more stages than predefined colors, generate additional colors
  // with maximum separation in hue space
  const baseHue = (index * 360) / totalStages;
  const saturation = 70 + (index % 3) * 10; // Vary saturation slightly
  const lightness = 45 + (index % 4) * 5;   // Vary lightness slightly
  
  return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const FunnelBar = ({ stages, totalLeads }: FunnelBarProps) => {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (idx: number, event: React.MouseEvent) => {
    setHoveredStage(idx);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredStage(null);
  };

  return (
    <div className="w-full">
      <div className="flex w-full h-16 rounded overflow-hidden shadow relative">
        {stages.map((stage, idx) => {
          const width = stage.value;
          const color = getColorForStage(stage.name, idx, stages.length);
          const showLabel = width >= 15;

          return (
            <div
              key={idx}
              className="flex items-center justify-center text-white text-xs font-semibold overflow-hidden relative cursor-pointer hover:brightness-110 transition-all"
              style={{
                backgroundColor: color,
                width: `${width}%`,
                minWidth: "4px",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => handleMouseEnter(idx, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {showLabel ? (
                <div className="text-center leading-tight px-1 truncate">
                  <div>{stage.name}</div>
                  <div>{stage.value.toFixed(0)}%</div>
                </div>
              ) : (
                <div className="text-xs px-1">{stage.value.toFixed(0)}%</div>
              )}
            </div>
          );
        })}
        
        {/* Tooltip */}
        {hoveredStage !== null && stages[hoveredStage]?.isVendaGanha && stages[hoveredStage]?.totalValue && (
          <div
            className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 pointer-events-none"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 40,
            }}
          >
            <div className="text-sm font-semibold">{stages[hoveredStage].name}</div>
            <div className="text-xs text-gray-300">
              Valor total: {formatCurrency(stages[hoveredStage].totalValue || 0)}
            </div>
          </div>
        )}
      </div>

      <p className="text-center mt-4 text-gray-400">
        Total de Leads:{" "}
        <span className="text-white font-semibold">{totalLeads}</span>
      </p>

      <div className="mt-6 space-y-2">
        <h4 className="text-white font-semibold text-sm mb-2">Legenda:</h4>
        {stages.map((stage, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-sm text-gray-200"
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getColorForStage(stage.name, idx, stages.length) }}
            ></div>
            <span>
              {stage.name} ({stage.count})
              {stage.isVendaGanha && stage.totalValue && (
                <span className="text-green-400 ml-2">
                  - {formatCurrency(stage.totalValue)}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
