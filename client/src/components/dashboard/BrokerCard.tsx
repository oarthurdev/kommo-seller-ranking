import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Users, Target } from "lucide-react";
import { getServerBaseUrl } from "@/lib/utils";

interface Broker {
  id: number;
  nome: string;
  pontos: number;
  leads_capturados: number;
  propostas_enviadas: number;
  leads_perdidos: number;
  leads_descartados: number;
  vendas_realizadas: number;
  total_leads: number;
  leads_respondidos_1h?: number;
  leads_visitados?: number;
  leads_atualizados_mesmo_dia?: number;
  feedbacks_positivos?: number;
  resposta_rapida_3h?: number;
  todos_leads_respondidos?: number;
  cadastro_completo?: number;
  acompanhamento_pos_venda?: number;
  leads_sem_interacao_24h?: number;
  leads_ignorados_48h?: number;
  leads_respondidos_apos_18h?: number;
  leads_tempo_resposta_acima_12h?: number;
  leads_5_dias_sem_mudanca?: number;
  corretor_ocioso_mais_de_3h?: number;
  taxa_conversao?: number;
}

interface BrokerPoints {
  pontos: number;
  vendas_realizadas: number;
  propostas_enviadas: number;
  leads_perdidos: number;
}

interface BrokerCardProps {
  rank: number;
  broker: Broker;
  isTVScreen?: boolean;
  totalLeadsLastMonth?: number;
}

export function BrokerCard({
  rank,
  broker,
  isTVScreen = false,
  totalLeadsLastMonth = 0,
}: BrokerCardProps) {
  const iconSize = isTVScreen ? "w-6 h-6" : "w-5 h-5";

  // Use broker data directly from props (already fetched in RankingPage)
  const currentBrokerPoints = broker;

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className={`${iconSize} text-yellow-500`} />;
      case 2:
        return <Medal className={`${iconSize} text-gray-400`} />;
      case 3:
        return <Award className={`${iconSize} text-amber-600`} />;
      default:
        return (
          <div
            className={`${iconSize} rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white`}
          >
            {position}
          </div>
        );
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 1:
        return "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5";
      case 2:
        return "border-gray-400/50 bg-gradient-to-br from-gray-400/10 to-gray-500/5";
      case 3:
        return "border-amber-600/50 bg-gradient-to-br from-amber-600/10 to-amber-700/5";
      default:
        return "border-gray-700 bg-gray-800/50";
    }
  };

  // Use currentBrokerPoints data if available, otherwise fallback to broker data
  const displayPoints = currentBrokerPoints?.pontos ?? broker.pontos ?? 0;
  const displayVendas =
    currentBrokerPoints?.vendas_realizadas ?? broker.vendas_realizadas ?? 0;
  const displayPropostas =
    currentBrokerPoints?.propostas_enviadas ?? broker.propostas_enviadas ?? 0;
  const displayPerdidos =
    currentBrokerPoints?.leads_perdidos ?? broker.leads_perdidos ?? 0;
  const displayDescartados =
    currentBrokerPoints?.leads_descartados ?? broker.leads_descartados ?? 0;

  return (
    <Link href={`/ranking/broker/${broker.id}`}>
      <Card
        className={`${isTVScreen ? "h-96 p-8 hover:scale-105 tv-high-contrast tv-card-hover" : "h-64 p-4 hover:scale-102"} bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 cursor-pointer group relative overflow-hidden`}
      >
        {/* Header with rank and name */}
        <div
          className={`flex items-center ${isTVScreen ? "gap-3 mb-3" : "gap-2 mb-2"}`}
        >
          {getRankIcon(rank)}
          <div className="flex-1 min-w-0">
            <h3
              className={`font-bold text-white truncate ${isTVScreen ? "text-xl" : "text-lg"}`}
            >
              {broker.nome}
            </h3>
            <Badge
              variant="secondary"
              className={`
                ${
                  displayPoints < 0
                    ? "bg-red-500/20 text-red-300 border-red-500/30"
                    : displayPoints === 0
                      ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                }
                mt-2 ${isTVScreen ? "text-sm" : "text-xs"}
              `}
            >
              {displayPoints} pts
            </Badge>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className={`flex-2`}>
          <div className={`grid grid-cols-2 ${isTVScreen ? "gap-4" : "gap-2"}`}>
            <div
              className={`bg-gray-900/50 rounded-lg ${isTVScreen ? "p-3" : "p-2"}`}
            >
              <div
                className={`flex items-center ${isTVScreen ? "gap-2 mb-2" : "gap-1 mb-1"}`}
              >
                <Target
                  className={`${isTVScreen ? "w-4 h-4" : "w-3 h-3"} text-blue-400`}
                />
                <span
                  className={`text-gray-400 ${isTVScreen ? "text-sm" : "text-xs"}`}
                >
                  Leads
                </span>
              </div>
              <p
                className={`font-bold text-white ${isTVScreen ? "text-lg" : "text-sm"}`}
              >
                {currentBrokerPoints?.total_leads ?? broker.total_leads ?? 0}
              </p>
            </div>

            <div
              className={`bg-gray-900/50 rounded-lg ${isTVScreen ? "p-3" : "p-2"}`}
            >
              <div
                className={`flex items-center ${isTVScreen ? "gap-2 mb-2" : "gap-1 mb-1"}`}
              >
                <TrendingUp
                  className={`${isTVScreen ? "w-4 h-4" : "w-3 h-3"} text-green-400`}
                />
                <span
                  className={`text-gray-400 ${isTVScreen ? "text-sm" : "text-xs"}`}
                >
                  Propostas
                </span>
              </div>
              <p
                className={`font-bold text-white ${isTVScreen ? "text-lg" : "text-sm"}`}
              >
                {displayPropostas}
              </p>
            </div>
          </div>

          <div className={`grid grid-cols-2 ${isTVScreen ? "gap-4" : "gap-2"}`}>
            <div
              className={`bg-gray-900/50 rounded-lg ${isTVScreen ? "p-3" : "p-2"}`}
            >
              <div
                className={`flex items-center ${isTVScreen ? "gap-2 mb-2" : "gap-1 mb-1"}`}
              >
                <Users
                  className={`${isTVScreen ? "w-4 h-4" : "w-3 h-3"} text-red-400`}
                />
                <span
                  className={`text-gray-400 ${isTVScreen ? "text-sm" : "text-xs"}`}
                >
                  Perdidos
                </span>
              </div>
              <p
                className={`font-bold text-white ${isTVScreen ? "text-lg" : "text-sm"}`}
              >
                {displayPerdidos}
              </p>
            </div>

            <div
              className={`bg-gray-900/50 rounded-lg ${isTVScreen ? "p-3" : "p-2"}`}
            >
              <div
                className={`flex items-center ${isTVScreen ? "gap-2 mb-2" : "gap-1 mb-1"}`}
              >
                <div
                  className={`${isTVScreen ? "w-4 h-4" : "w-3 h-3"} rounded-full bg-orange-400`}
                />
                <span
                  className={`text-gray-400 ${isTVScreen ? "text-sm" : "text-xs"}`}
                >
                  Vendas
                </span>
              </div>
              <p
                className={`font-bold text-white ${isTVScreen ? "text-lg" : "text-sm"}`}
              >
                {displayVendas}
              </p>
            </div>

            <div
              className={`bg-gray-900/50 rounded-lg ${isTVScreen ? "p-3" : "p-2"}`}
            >
              <div
                className={`flex items-center ${isTVScreen ? "gap-2 mb-2" : "gap-1 mb-1"}`}
              >
                <Users
                  className={`${isTVScreen ? "w-4 h-4" : "w-3 h-3"} text-red-400`}
                />
                <span
                  className={`text-gray-400 ${isTVScreen ? "text-sm" : "text-xs"}`}
                >
                  Descartados
                </span>
              </div>
              <p
                className={`font-bold text-white ${isTVScreen ? "text-lg" : "text-sm"}`}
              >
                {displayDescartados}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`${isTVScreen ? "mt-4 pt-4" : "mt-3 pt-3"} border-t border-gray-700`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-gray-400 ${isTVScreen ? "text-sm" : "text-xs"}`}
            >
              Posição
            </span>
            <span
              className={`font-bold text-white ${isTVScreen ? "text-lg" : "text-base"}`}
            >
              #{rank}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
