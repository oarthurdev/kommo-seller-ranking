import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Phone,
} from "lucide-react";

interface BrokerData {
  id: number;
  nome: string;
  pontos?: number;
  leads_respondidos_1h?: number;
  leads_visitados?: number;
  propostas_enviadas?: number;
  vendas_realizadas?: number;
  leads_atualizados_mesmo_dia?: number;
  feedbacks_positivos?: number;
  resposta_rapida_3h?: number;
  todos_leads_respondidos?: number;
  cadastro_completo?: number;
  acompanhamento_pos_venda?: number;
  leads_sem_interacao_24h?: number;
  leads_ignorados_48h?: number;
  leads_perdidos?: number;
  leads_respondidos_apos_18h?: number;
  leads_tempo_resposta_acima_12h?: number;
  leads_5_dias_sem_mudanca?: number;
  corretor_ocioso_mais_de_3h?: number;
  vgv_mes?: number;
  tempo_primeira_interacao?: string;
  vendas_fechadas?: number;
  angariacoes?: number;
  taxa_conversao?: number;
}

interface IndividualAnalysisProps {
  brokerData: BrokerData | null;
  brokerName: string;
  rankPosition: number;
  isLoading?: boolean;
}

export function IndividualAnalysis({
  brokerData,
  brokerName,
  rankPosition,
  isLoading = false,
}: IndividualAnalysisProps) {
  if (isLoading || !brokerData) {
    return (
      <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Métricas positivas (pontos ganhos)
  const positiveMetrics = [
    {
      label: "Leads visitados",
      value: brokerData.leads_visitados || 0,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      label: "Propostas enviadas",
      value: brokerData.propostas_enviadas || 0,
      icon: MessageSquare,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
    },
    {
      label: "Vendas realizadas",
      value: brokerData.vendas_realizadas || 0,
      icon: Award,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
  ];

  // Métricas negativas (pontos perdidos)
  const negativeMetrics = [
    {
      label: "Leads perdidos",
      value: brokerData.leads_perdidos || 0,
      icon: TrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
    },
  ];

  const totalPoints = brokerData.pontos || 0;
  const maxPossiblePoints = 1000; // Valor estimado baseado no sistema de pontuação

  return (
    <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-semibold text-white">
          Análise Individual - {brokerName}
        </h2>
        <div className="ml-auto">
          <span className="px-3 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
            #{rankPosition}º Posição
          </span>
        </div>
      </div>

      {/* Resumo de Pontuação */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Pontuação Total</span>
          <span className="text-2xl font-bold text-white">{totalPoints}</span>
        </div>
        <Progress
          value={(totalPoints / maxPossiblePoints) * 100}
          className="h-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          {((totalPoints / maxPossiblePoints) * 100).toFixed(1)}% do potencial
          máximo
        </p>
      </div>

      {/* Métricas Positivas */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-green-400 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Ações Positivas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {positiveMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg ${metric.bgColor} flex items-center justify-center`}
                >
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 truncate">
                    {metric.label}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {metric.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas Negativas */}
      <div>
        <h3 className="text-lg font-medium text-red-400 mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" />
          Pontos de Atenção
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {negativeMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-lg ${metric.bgColor} flex items-center justify-center`}
                >
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 truncate">
                    {metric.label}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {metric.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
