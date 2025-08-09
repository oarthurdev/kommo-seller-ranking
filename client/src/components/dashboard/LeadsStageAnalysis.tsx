
import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';

interface StageData {
  count: number;
  totalValue: number;
  avgValue: number;
  conversionRate: number;
  brokerCount: number;
}

interface LeadsStageAnalysisProps {
  stageAnalysis: { [stage: string]: StageData };
  totalLeads: number;
  wonLeads: number;
  overallConversionRate: number;
  isLoading?: boolean;
}

export function LeadsStageAnalysis({ 
  stageAnalysis, 
  totalLeads, 
  wonLeads, 
  overallConversionRate,
  isLoading = false 
}: LeadsStageAnalysisProps) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-gray-800/50 backdrop-blur-sm border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const stages = Object.entries(stageAnalysis).sort(
    ([, a], [, b]) => b.count - a.count
  );

  const maxCount = Math.max(...Object.values(stageAnalysis).map(s => s.count));

  return (
    <Card className="p-6 bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">
          Análise de Leads por Etapa
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Total de Leads</p>
            <p className="text-2xl font-bold text-white">{totalLeads}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Vendas Ganhas</p>
            <p className="text-2xl font-bold text-green-400">{wonLeads}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Taxa de Conversão</p>
            <p className="text-2xl font-bold text-blue-400">
              {overallConversionRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map(([stageName, stageData]) => (
          <div key={stageName} className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-white text-sm">{stageName}</h4>
                <p className="text-xs text-gray-400">
                  {stageData.count} leads • {stageData.conversionRate.toFixed(1)}% do total
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Valor médio</p>
                <p className="text-sm font-semibold text-white">
                  R$ {(stageData.avgValue / 1000).toFixed(0)}k
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progresso no funil</span>
                <span>{((stageData.count / maxCount) * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={(stageData.count / maxCount) * 100} 
                className="h-2"
              />
            </div>

            <div className="flex justify-between mt-3 text-xs">
              <div className="flex items-center gap-1 text-blue-400">
                <Users className="w-3 h-3" />
                <span>{stageData.brokerCount} corretores</span>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <DollarSign className="w-3 h-3" />
                <span>R$ {(stageData.totalValue / 1000).toFixed(0)}k total</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
