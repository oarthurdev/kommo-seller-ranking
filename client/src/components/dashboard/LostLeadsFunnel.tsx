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
      <div className="flex items-center justify-between mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Total:{" "}
            <span className="text-red-400 font-semibold text-lg">
              {totalLostLeads}
            </span>{" "}
            leads perdidos
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map((stage, index) => {
          const widthPercent =
            maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const percentage =
            totalLostLeads > 0 ? (stage.count / totalLostLeads) * 100 : 0;
          // Usar cor do backend (cada etapa já vem com cor única)
          const stageData = lostLeads[stage.name];
          const color = stageData?.color || "#DC2626";

          return (
            <div key={index} className="relative">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-sm font-medium text-card-foreground">
                    {stage.name}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {percentage.toFixed(1)}%
                </div>
              </div>
              <div
                className="h-10 rounded-lg transition-all duration-500 flex items-center justify-between px-4 relative shadow-sm"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: color,
                  minWidth: stage.count > 0 ? "80px" : "0",
                }}
              >
                <span className="text-white font-semibold text-sm">
                  {stage.count} leads
                </span>
                <span className="text-white text-xs opacity-90 font-medium">
                  {percentage.toFixed(1)}%
                </span>
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
