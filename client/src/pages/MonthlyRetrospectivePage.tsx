import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  Trophy,
  Calendar,
  TrendingUp,
  TrendingDown,
  Medal,
  Star,
  Award,
  Crown,
  Target,
  BarChart3,
  Users,
  Activity,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getMonthlyRetrospective } from "@/lib/api";
import { useIsTVScreen } from "@/hooks/use-mobile";
import { useBranding } from "@/lib/brandingContext";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface MonthlyMetrics {
  leadsCapturados: number;
  vendasRealizadas: number;
  valorVendas: number;
  atividadesRealizadas: number;
  pontuacaoAtual: number;
  ticketMedio: number;
}

interface Broker {
  id: number;
  nome: string;
  email: string;
  foto_url: string;
  cargo: string;
  monthlyMetrics: MonthlyMetrics;
}

interface MonthlyRetrospective {
  periodo: {
    mes: number;
    ano: number;
    mesNome: string;
    dataInicio: string;
    dataFim: string;
  };
  vencedores: {
    maiorPontuacao: Broker;
    maiorVendas: Broker;
    maisLeads: Broker;
    maisAtivo: Broker;
  };
  rankings: {
    porPontos: Broker[];
    porVendas: Broker[];
    porLeads: Broker[];
    porAtividades: Broker[];
  };
  resumoGeral: {
    totalCorretores: number;
    totalLeads: number;
    totalVendas: number;
    totalAtividades: number;
    mediaPontos: number;
  };
}

export function MonthlyRetrospectivePage() {
  const params = useParams();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(
    params.year ? parseInt(params.year) : currentDate.getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    params.month ? parseInt(params.month) : currentDate.getMonth() + 1,
  );

  const { data: retrospective, isLoading } = useQuery<MonthlyRetrospective>({
    queryKey: [`/api/retrospective/${selectedYear}/${selectedMonth}`],
    queryFn: () =>
      fetch(`/api/retrospective/${selectedYear}/${selectedMonth}`).then((res) =>
        res.json(),
      ),
  });

  const { data: winnersHistory } = useQuery({
    queryKey: ["/api/retrospective/winners-history"],
    queryFn: () =>
      fetch("/api/retrospective/winners-history?limite=6").then((res) =>
        res.json(),
      ),
  });

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const getWinnerIcon = (type: string) => {
    switch (type) {
      case "pontos":
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case "vendas":
        return <DollarSign className="w-6 h-6 text-green-400" />;
      case "leads":
        return <Users className="w-6 h-6 text-blue-400" />;
      case "atividades":
        return <Activity className="w-6 h-6 text-purple-400" />;
      default:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando retrospectiva...</p>
        </div>
      </div>
    );
  }

  // Se não há dados para o período selecionado
  if (!isLoading && !retrospective) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const isFutureOrCurrent =
      selectedYear > currentYear ||
      (selectedYear === currentYear && selectedMonth >= currentMonth);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/5 to-orange-600/5"></div>
          <div className="relative px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-xl">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                    Retrospectiva Mensal
                  </h1>
                  <p className="text-gray-400 text-xl mb-3">
                    {String(selectedMonth).padStart(2, "0")}/{selectedYear}
                  </p>
                </div>
              </div>

              {/* Navegação de Mês */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="border-gray-600 hover:border-gray-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Navegar Período</p>
                  <p className="font-mono text-lg text-yellow-400">
                    {String(selectedMonth).padStart(2, "0")}/{selectedYear}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="border-gray-600 hover:border-gray-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <Card className="bg-gray-800/50 border-gray-700 p-8 text-center max-w-md">
              <div className="mb-4">
                {isFutureOrCurrent ? (
                  <Calendar className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                ) : (
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {isFutureOrCurrent
                  ? "Período Não Disponível"
                  : "Dados Não Encontrados"}
              </h3>
              <p className="text-gray-400">
                {isFutureOrCurrent
                  ? "As retrospectivas mensais só ficam disponíveis após o fechamento do mês."
                  : "Não foram encontrados dados salvos para este período. Os dados retrospectivos são salvos automaticamente no final de cada mês."}
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/5 to-orange-600/5"></div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-xl">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  📊
                </div>
              </div>

              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                  Retrospectiva Mensal
                </h1>
                <p className="text-gray-400 text-xl mb-3">
                  {retrospective?.periodo.mesNome} de{" "}
                  {retrospective?.periodo.ano}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Dados Consolidados
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navegação de Mês */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
                className="border-gray-600 hover:border-gray-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm text-gray-400">Navegar Período</p>
                <p className="font-mono text-lg text-yellow-400">
                  {String(selectedMonth).padStart(2, "0")}/{selectedYear}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
                className="border-gray-600 hover:border-gray-500"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {retrospective && (
          <>
            {/* Resumo Geral */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Corretores Ativos</p>
                    <p className="text-2xl font-bold text-white">
                      {retrospective.resumoGeral.totalCorretores}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total em Vendas</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(retrospective.resumoGeral.totalVendas)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total de Leads</p>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(retrospective.resumoGeral.totalLeads)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-orange-400" />
                  <div>
                    <p className="text-sm text-gray-400">Atividades</p>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(retrospective.resumoGeral.totalAtividades)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Vencedores por Categoria */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                Vencedores do Mês
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Maior Pontuação */}
                <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20 p-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <Crown className="w-12 h-12 text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                      Maior Pontuação
                    </h3>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold">
                      {getInitials(
                        retrospective.vencedores.maiorPontuacao.nome,
                      )}
                    </div>
                    <p className="font-semibold text-white">
                      {retrospective.vencedores.maiorPontuacao.nome}
                    </p>
                    <p className="text-3xl font-bold text-yellow-400 mt-2">
                      {formatNumber(
                        retrospective.vencedores.maiorPontuacao.monthlyMetrics
                          .pontuacaoAtual,
                      )}{" "}
                      pts
                    </p>
                  </div>
                </Card>

                {/* Maior em Vendas */}
                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 p-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <DollarSign className="w-12 h-12 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-300 mb-2">
                      Maior em Vendas
                    </h3>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold">
                      {getInitials(retrospective.vencedores.maiorVendas.nome)}
                    </div>
                    <p className="font-semibold text-white">
                      {retrospective.vencedores.maiorVendas.nome}
                    </p>
                    <p className="text-2xl font-bold text-green-400 mt-2">
                      {formatCurrency(
                        retrospective.vencedores.maiorVendas.monthlyMetrics
                          .valorVendas,
                      )}
                    </p>
                  </div>
                </Card>

                {/* Mais Leads */}
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 p-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <Users className="w-12 h-12 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-blue-300 mb-2">
                      Mais Leads
                    </h3>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold">
                      {getInitials(retrospective.vencedores.maisLeads.nome)}
                    </div>
                    <p className="font-semibold text-white">
                      {retrospective.vencedores.maisLeads.nome}
                    </p>
                    <p className="text-3xl font-bold text-blue-400 mt-2">
                      {formatNumber(
                        retrospective.vencedores.maisLeads.monthlyMetrics
                          .leadsCapturados,
                      )}
                    </p>
                  </div>
                </Card>

                {/* Mais Ativo */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <Activity className="w-12 h-12 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-purple-300 mb-2">
                      Mais Ativo
                    </h3>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold">
                      {getInitials(retrospective.vencedores.maisAtivo.nome)}
                    </div>
                    <p className="font-semibold text-white">
                      {retrospective.vencedores.maisAtivo.nome}
                    </p>
                    <p className="text-3xl font-bold text-purple-400 mt-2">
                      {formatNumber(
                        retrospective.vencedores.maisAtivo.monthlyMetrics
                          .atividadesRealizadas,
                      )}
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Rankings Detalhados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Ranking por Pontos */}
              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Ranking por Pontos
                </h3>
                <div className="space-y-3">
                  {retrospective.rankings.porPontos
                    .slice(0, 5)
                    .map((broker, index) => (
                      <div
                        key={broker.id}
                        className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-yellow-500 text-black"
                                : index === 1
                                  ? "bg-gray-400 text-black"
                                  : index === 2
                                    ? "bg-orange-600 text-white"
                                    : "bg-gray-600 text-white"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {broker.nome}
                            </p>
                            <p className="text-sm text-gray-400">
                              {broker.cargo}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-yellow-400">
                          {formatNumber(broker.monthlyMetrics.pontuacaoAtual)}{" "}
                          pts
                        </p>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Ranking por Vendas */}
              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Ranking por Vendas
                </h3>
                <div className="space-y-3">
                  {retrospective.rankings.porVendas
                    .slice(0, 5)
                    .map((broker, index) => (
                      <div
                        key={broker.id}
                        className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-green-500 text-black"
                                : index === 1
                                  ? "bg-gray-400 text-black"
                                  : index === 2
                                    ? "bg-orange-600 text-white"
                                    : "bg-gray-600 text-white"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {broker.nome}
                            </p>
                            <p className="text-sm text-gray-400">
                              {broker.monthlyMetrics.vendasRealizadas} vendas
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-green-400">
                          {formatCurrency(broker.monthlyMetrics.valorVendas)}
                        </p>
                      </div>
                    ))}
                </div>
              </Card>
            </div>

            {/* Histórico de Vencedores */}
            {winnersHistory && winnersHistory.length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Histórico de Vencedores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {winnersHistory
                    .slice(1, 7)
                    .map((month: any, index: number) => (
                      <Card
                        key={`${month.ano}-${month.mes}`}
                        className="bg-gray-700/30 border-gray-600 p-4"
                      >
                        <div className="text-center">
                          <h4 className="font-semibold text-white mb-2">
                            {month.periodo.mesNome} {month.periodo.ano}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                👑 Pontos:
                              </span>
                              <span className="text-sm font-semibold text-yellow-400">
                                {month.vencedores?.maiorPontuacao?.nome?.split(
                                  " ",
                                )[0] || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                💰 Vendas:
                              </span>
                              <span className="text-sm font-semibold text-green-400">
                                {month.vencedores?.maiorVendas?.nome?.split(
                                  " ",
                                )[0] || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                📊 Leads:
                              </span>
                              <span className="text-sm font-semibold text-blue-400">
                                {month.vencedores?.maisLeads?.nome?.split(
                                  " ",
                                )[0] || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
