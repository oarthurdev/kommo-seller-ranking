import React from 'react';

// Dados do funil
interface FunnelStage {
  name: string;
  value: number;
  color: string;
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
}

export function ConversionFunnel({ stages }: ConversionFunnelProps) {
  // Width percentages para cada etapa do funil
  const maxValue = Math.max(...stages.map(stage => stage.value));
  
  return (
    <div className="bg-card p-4 rounded-lg shadow border border-border">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground">Funil de Conversão</h3>
      
      <div className="space-y-4">
        {stages.map((stage, index) => {
          // Calcular a largura relativa para esta etapa
          const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="relative">
              <div className="text-sm text-muted-foreground mb-1">{stage.name}</div>
              <div 
                className="h-8 rounded transition-all duration-500 flex items-center justify-start px-3"
                style={{ 
                  width: `${widthPercent}%`,
                  backgroundColor: stage.color,
                  minWidth: stage.value > 0 ? '40px' : '0'
                }}
              >
                <span className="text-white font-medium">{stage.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}