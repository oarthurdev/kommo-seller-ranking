import React, { useState } from "react";
import { Info, Activity } from "lucide-react";
import { PeriodFilter, PeriodFilterData } from "@/components/ui/PeriodFilter";
import { useQueryClient } from "@tanstack/react-query";
import { useUnifiedFilter } from "@/lib/unifiedFilterContext";

interface HeatMapProps {
  dados: {
    dias: string[];
    horarios: string[];
    mensagensRecebidas: number[][];
    mensagensEnviadas: number[][];
    reset_info?: string;
  };
  titulo?: string;
  componentName?: string;
  onFilterChange?: (filter: PeriodFilterData) => void;
  showFilter?: boolean;
}

export function HeatMap({
  dados,
  titulo = "Mapa de Atividade",
  componentName = "broker_heatmap",
  onFilterChange,
  showFilter = true,
}: HeatMapProps) {
  const queryClient = useQueryClient();
  const [currentFilter, setCurrentFilter] = useState<PeriodFilterData>({
    filter_type: "current_month",
  });

  const handleFilterChange = (filter: PeriodFilterData) => {
    setCurrentFilter(filter);

    // Invalidar queries relacionadas ao heatmap
    queryClient.invalidateQueries({ queryKey: ["brokerHeatmap"] });
    queryClient.invalidateQueries({ queryKey: ["activityHeatmap"] });
    queryClient.invalidateQueries({ queryKey: ["weeklyActivityHeatmap"] });

    // Notificar componente pai se callback foi fornecido
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };
  // Verificar se os dados existem e têm o formato correto
  if (!dados) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-white" />
            <h3 className="text-lg font-semibold text-white">{titulo}</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Nenhum dado de atividade disponível</p>
        </div>
      </div>
    );
  }

  // Log de debug para verificar dados recebidos
  console.log("HeatMap dados recebidos:", {
    diasLength: dados.dias?.length || 0,
    horariosLength: dados.horarios?.length || 0,
    mensagensRecebidasLength: dados.mensagensRecebidas?.length || 0,
    mensagensEnviadasLength: dados.mensagensEnviadas?.length || 0,
    debugInfo: dados.debug_info,
  });

  const mensagensRecebidas = dados.mensagensRecebidas || [];
  const mensagensEnviadas = dados.mensagensEnviadas || [];
  const dias = dados.dias || [];
  const horarios = dados.horarios || [];

  // Encontra o valor máximo para normalizar a intensidade das cores (considerando ambos os tipos)
  const maxValueRecebidas =
    mensagensRecebidas.length > 0
      ? mensagensRecebidas.reduce((max, row) => {
          const rowMax = Math.max(...(row || []));
          return rowMax > max ? rowMax : max;
        }, 0)
      : 0;

  const maxValueEnviadas =
    mensagensEnviadas.length > 0
      ? mensagensEnviadas.reduce((max, row) => {
          const rowMax = Math.max(...(row || []));
          return rowMax > max ? rowMax : max;
        }, 0)
      : 0;

  const maxValue = Math.max(maxValueRecebidas, maxValueEnviadas);

  // Função para calcular a cor das mensagens recebidas (azul)
  const getColorRecebidas = (value: number) => {
    if (value === 0) return "transparent";
    const normalizedValue = value / maxValue;
    return `rgba(59, 130, 246, ${0.3 + normalizedValue * 0.7})`;
  };

  // Função para calcular a cor das mensagens enviadas (verde)
  const getColorEnviadas = (value: number) => {
    if (value === 0) return "transparent";
    const normalizedValue = value / maxValue;
    return `rgba(34, 197, 94, ${0.3 + normalizedValue * 0.7})`;
  };

  // Determina se o texto deve ser branco ou preto
  const getTextColor = (valueRecebidas: number, valueEnviadas: number) => {
    const totalValue = valueRecebidas + valueEnviadas;
    if (totalValue === 0) return "text-muted-foreground";

    const normalizedValue = totalValue / (maxValue * 2);

    if (normalizedValue > 0.4) return "text-white font-semibold";
    return "text-gray-900 font-medium";
  };

  // Se não há dados válidos, mostrar estado vazio
  if (
    dias.length === 0 ||
    horarios.length === 0 ||
    mensagensRecebidas.length === 0 ||
    mensagensEnviadas.length === 0
  ) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-white" />
            <h3 className="text-lg font-semibold text-white">{titulo}</h3>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">
              Nenhum dado de atividade disponível
            </p>
            {dados.debug_info && (
              <p className="text-xs text-gray-500">
                Debug: {dados.debug_info.sentEventsCount} enviadas,{" "}
                {dados.debug_info.receivedMessagesCount} recebidas
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-white" />
          <h3 className="text-lg font-semibold text-white">{titulo}</h3>
        </div>
        {showFilter && (
          <div className="ml-4">
            <PeriodFilter
              componentName={componentName}
              onFilterChange={handleFilterChange}
              compact={true}
              className="max-w-md"
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-hidden">
          <table className="w-full h-full">
            <thead>
              <tr className="text-xs">
                <th className="font-normal text-gray-400 w-12"></th>
                {dias.map((dia, index) => (
                  <th
                    key={index}
                    className="px-1 py-1 font-medium text-white text-center"
                  >
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...horarios].reverse().map((horario, horarioIndex) => {
                const actualIndex = horarios.length - 1 - horarioIndex;
                return (
                  <tr key={horarioIndex}>
                    <td className="text-xs font-medium text-white p-1 text-right pr-2">
                      {horario}
                    </td>
                    {dias.map((_, diaIndex) => {
                      // Validação de segurança para evitar erros de índice
                      const valueRecebidas =
                        mensagensRecebidas[diaIndex] &&
                        Array.isArray(mensagensRecebidas[diaIndex]) &&
                        typeof mensagensRecebidas[diaIndex][actualIndex] ===
                          "number"
                          ? mensagensRecebidas[diaIndex][actualIndex]
                          : 0;

                      const valueEnviadas =
                        mensagensEnviadas[diaIndex] &&
                        Array.isArray(mensagensEnviadas[diaIndex]) &&
                        typeof mensagensEnviadas[diaIndex][actualIndex] ===
                          "number"
                          ? mensagensEnviadas[diaIndex][actualIndex]
                          : 0;

                      const totalValue = valueRecebidas + valueEnviadas;

                      return (
                        <td key={diaIndex} className="p-0.5">
                          <div
                            className="w-full h-6 rounded shadow-sm mx-auto relative overflow-hidden"
                            style={{
                              backgroundColor: "rgba(30, 41, 59, 0.4)",
                              transition: "all 0.3s ease",
                            }}
                            title={`${valueRecebidas} recebidas, ${valueEnviadas} enviadas`}
                          >
                            {/* Quando há apenas mensagens recebidas */}
                            {valueRecebidas > 0 && valueEnviadas === 0 && (
                              <div
                                className="absolute inset-0 rounded"
                                style={{
                                  backgroundColor:
                                    getColorRecebidas(valueRecebidas),
                                }}
                              />
                            )}

                            {/* Quando há apenas mensagens enviadas */}
                            {valueEnviadas > 0 && valueRecebidas === 0 && (
                              <div
                                className="absolute inset-0 rounded"
                                style={{
                                  backgroundColor:
                                    getColorEnviadas(valueEnviadas),
                                }}
                              />
                            )}

                            {/* Quando há ambos os tipos - dividir diagonalmente */}
                            {valueRecebidas > 0 && valueEnviadas > 0 && (
                              <>
                                {/* Triângulo superior esquerdo - Mensagens Recebidas (azul) */}
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    backgroundColor:
                                      getColorRecebidas(valueRecebidas),
                                    clipPath: "polygon(0 0, 100% 0, 0 100%)",
                                  }}
                                />
                                {/* Triângulo inferior direito - Mensagens Enviadas (verde) */}
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    backgroundColor:
                                      getColorEnviadas(valueEnviadas),
                                    clipPath:
                                      "polygon(100% 0, 100% 100%, 0 100%)",
                                  }}
                                />
                                {/* Linha divisória diagonal */}
                                <div
                                  className="absolute inset-0 border-0"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, transparent 49%, rgba(255,255,255,0.3) 49%, rgba(255,255,255,0.3) 51%, transparent 51%)",
                                  }}
                                />
                              </>
                            )}

                            {/* Texto com valores específicos para cada tipo quando ambos existem */}
                            {valueRecebidas > 0 && valueEnviadas > 0 && (
                              <>
                                {/* Número de recebidas no canto superior esquerdo */}
                                <div className="absolute top-0 left-0 text-[10px] font-bold text-white p-0.5 leading-none">
                                  {valueRecebidas}
                                </div>
                                {/* Número de enviadas no canto inferior direito */}
                                <div className="absolute bottom-0 right-0 text-[10px] font-bold text-white p-0.5 leading-none">
                                  {valueEnviadas}
                                </div>
                              </>
                            )}

                            {/* Texto centralizado quando há apenas um tipo */}
                            {totalValue > 0 &&
                              (valueRecebidas === 0 || valueEnviadas === 0) && (
                                <div
                                  className={`absolute inset-0 flex items-center justify-center text-xs ${getTextColor(valueRecebidas, valueEnviadas)} z-10`}
                                >
                                  {totalValue}
                                </div>
                              )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legenda Detalhada */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-300">
              Horário Comercial • Seg-Sex: 8:00-12:00 / 13:30-18:00
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            {/* Tipos de Mensagem */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-white">Recebidas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-white">Enviadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-green-500"></div>
                <span className="text-white">Ambas</span>
              </div>
            </div>

            {/* Intensidade */}
            <div className="flex items-center gap-3">
              <span className="text-white">Volume:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/30"></div>
                <span className="text-white">Baixo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/60"></div>
                <span className="text-white">Médio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-white">Alto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
