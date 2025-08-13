import React from "react";

interface LostLeadStage {
  name: string;
  count: number;
}

interface LostLeadsFunnelProps {
  lostLeads: {
    [stage: string]: {
      count: number;
      totalValue: number;
      color?: string;
      pipeline_id?: number;
      status_id?: number;
    };
  };
}

export function LostLeadsFunnel({ lostLeads }: LostLeadsFunnelProps) {
  // Converter objeto para array e ordenar por count
  const stages: LostLeadStage[] = Object.entries(lostLeads)
    .map(([name, data]) => ({
      name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  if (stages.length === 0) {
    return (
      <div>
        <div className="text-center py-8 text-gray-400">
          Nenhum lead perdido encontrado
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((stage) => stage.count));
  const totalLostLeads = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div>
      {/* Header com totais em destaque */}
      <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
        <div className="text-center">
          <p className="text-red-400 font-bold text-2xl mb-1">
            {totalLostLeads}
          </p>
          <p className="text-gray-300 text-sm">
            Total de leads perdidos no período
          </p>
        </div>
      </div>

      {/* Lista detalhada por etapa */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
          📊 Detalhamento por Etapa
        </h4>
        
        {stages.map((stage, index) => {
          const widthPercent =
            maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const percentage =
            totalLostLeads > 0 ? (stage.count / totalLostLeads) * 100 : 0;
          const stageData = lostLeads[stage.name];
          const color = stageData?.color || "#DC2626";

          return (
            <div key={index} className="bg-gray-900/30 rounded-lg p-3 border border-gray-700/30">
              {/* Header da etapa */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <h5 className="text-white font-medium text-sm">
                      {stage.name}
                    </h5>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold text-lg">
                    {stage.count}
                  </div>
                  <div className="text-xs text-gray-400">
                    {percentage.toFixed(1)}% do total
                  </div>
                </div>
              </div>

              {/* Barra visual */}
              <div className="relative">
                <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Leads perdidos nesta etapa</span>
                  <span>{widthPercent.toFixed(0)}% da etapa com mais perdas</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <h4 className="text-sm font-medium text-white">Resumo por Etapa</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {stages.map((stage, index) => {
            const stageData = lostLeads[stage.name];
            const color = stageData?.color || "#DC2626";

            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                ></div>
                <div className="text-gray-400 truncate">
                  <div>
                    {stage.name}:{" "}
                    <span className="font-medium text-white">
                      {stage.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
