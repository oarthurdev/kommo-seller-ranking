import React from "react";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  BarChart3,
  Target,
  Award,
  Users,
  AlertTriangle,
} from "lucide-react";

interface BrokerRanking {
  id: number;
  nome: string;
  pontos: number;
  leads_visitados?: number;
  propostas_enviadas?: number;
  vendas_realizadas?: number;
  leads_perdidos?: number;
  total_leads?: number;
  taxa_conversao?: number;
}

interface PerformanceComparisonProps {
  brokers: BrokerRanking[];
  isLoading?: boolean;
}

export function PerformanceComparison({
  brokers = [],
  isLoading = false,
}: PerformanceComparisonProps) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Verificar se brokers existe e tem dados
  if (!Array.isArray(brokers) || brokers.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum dado de corretores disponível</p>
        </div>
      </Card>
    );
  }

  // Filtrar e ordenar corretores por taxa de conversão (apenas os que têm conversão > 0)
  const topConverters = brokers
    .filter(broker => (broker.taxa_conversao || 0) > 0)
    .sort((a, b) => (b.taxa_conversao || 0) - (a.taxa_conversao || 0))
    .slice(0, 5); // Top 5 conversores

  // Estatísticas de conversão
  const avgConversion = topConverters.length > 0 
    ? topConverters.reduce((sum, broker) => sum + (broker.taxa_conversao || 0), 0) / topConverters.length
    : 0;

  const maxConversion = topConverters.length > 0 
    ? Math.max(...topConverters.map(broker => broker.taxa_conversao || 0))
    : 0;

  const totalConversions = topConverters.reduce((sum, broker) => sum + (broker.vendas_realizadas || 0), 0);

  return (
    <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-green-400" />
        <h2 className="text-xl font-semibold text-white">Maiores Conversores do Mês Passado</h2>
      </div>

      {topConverters.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum corretor com conversões registradas no mês passado</p>
        </div>
      ) : (
        <>
          {/* Estatísticas de Conversão */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400">Conversores Ativos</span>
              </div>
              <p className="text-2xl font-bold text-white">{topConverters.length}</p>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Conversão Média</span>
              </div>
              <p className="text-2xl font-bold text-white">{avgConversion.toFixed(1)}%</p>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Maior Conversão</span>
              </div>
              <p className="text-2xl font-bold text-white">{maxConversion.toFixed(1)}%</p>
            </div>
          </div>

          {/* Top Conversores */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Top {topConverters.length} Conversores
            </h3>
            {topConverters.map((broker, index) => (
              <div key={broker.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' :
                    'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{broker.nome}</p>
                    <p className="text-sm text-gray-400">{broker.pontos} pontos no ranking</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-gray-400">Taxa de</p>
                    <p className="text-gray-400">Conversão</p>
                    <p className="text-xl font-bold text-green-400">
                      {broker.taxa_conversao?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">Vendas</p>
                    <p className="text-gray-400">Realizadas</p>
                    <p className="text-lg font-semibold text-white">
                      {broker.vendas_realizadas || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">Propostas</p>
                    <p className="text-gray-400">Enviadas</p>
                    <p className="text-lg font-semibold text-white">
                      {broker.propostas_enviadas || 0}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumo Final */}
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-green-400 font-semibold mb-1">Total de Conversões</h4>
                <p className="text-gray-300 text-sm">Vendas realizadas pelos top conversores</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">{totalConversions}</p>
                <p className="text-sm text-gray-400">vendas fechadas</p>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}