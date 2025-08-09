import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Settings, Save, ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useBranding } from "@/lib/brandingContext";

interface ComponentFilter {
  id: number;
  component_name: string;
  filter_type: string;
  start_date?: string;
  end_date?: string;
}

interface FilterFormData {
  component_name: string;
  filter_type: string;
  start_date?: string;
  end_date?: string;
}

const COMPONENT_OPTIONS = [
  { value: "ranking_metrics", label: "Métricas do Ranking" },
  { value: "broker_performance_metrics", label: "Métricas de Performance do Corretor" },
  { value: "broker_heatmap", label: "Mapa de Atividade do Corretor" },
  { value: "sales_funnel", label: "Funil de Vendas" },
  { value: "lost_leads_funnel", label: "Funil de Leads Perdidos" },
];

const FILTER_TYPE_OPTIONS = [
  { value: "current_week", label: "Semana Atual" },
  { value: "current_month", label: "Mês Atual" },
  { value: "last_month", label: "Mês Passado" },
  { value: "custom_range", label: "Período Personalizado" },
];

export function FilterConfigPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { branding } = useBranding();
  const [editingFilter, setEditingFilter] = useState<ComponentFilter | null>(null);
  const [formData, setFormData] = useState<FilterFormData>({
    component_name: "",
    filter_type: "",
    start_date: "",
    end_date: "",
  });

  // Buscar filtros existentes
  const { data: filters, isLoading } = useQuery<ComponentFilter[]>({
    queryKey: ["componentFilters"],
    queryFn: async () => {
      const res = await fetch("/api/component-filters");
      if (!res.ok) throw new Error("Erro ao buscar filtros");
      return res.json();
    },
  });

  // Mutation para salvar filtro
  const saveMutation = useMutation({
    mutationFn: async (data: FilterFormData) => {
      const method = editingFilter ? "PUT" : "POST";
      const url = editingFilter
        ? `/api/component-filters/${editingFilter.id}`
        : "/api/component-filters";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Erro ao salvar filtro");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["componentFilters"] });

      // Invalidar queries específicas baseadas no componente alterado
      switch (variables.component_name) {
        case "ranking_metrics":
          queryClient.invalidateQueries({ queryKey: ["brokerRankings"] });
          queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
          break;
        case "broker_performance_metrics":
          queryClient.invalidateQueries({ queryKey: ["brokerWeeklyPerformance"] });
          break;
        case "broker_heatmap":
          queryClient.invalidateQueries({ queryKey: ["activityHeatmap"] });
          queryClient.invalidateQueries({ queryKey: ["weeklyActivityHeatmap"] });
          break;
        case "sales_funnel":
          queryClient.invalidateQueries({ queryKey: ["brokerLeads"] });
          queryClient.invalidateQueries({ queryKey: ["brokerLeadsWithTicket"] });
          queryClient.invalidateQueries({ queryKey: ["brokerEtapas"] });
          break;
        case "lost_leads_funnel":
          queryClient.invalidateQueries({ queryKey: ["brokerLostLeads"] });
          break;
      }

      toast({
        title: "Sucesso",
        description: editingFilter ? "Filtro atualizado com sucesso!" : "Filtro criado com sucesso!",
      });
      setEditingFilter(null);
      setFormData({
        component_name: "",
        filter_type: "",
        start_date: "",
        end_date: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar filtro",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (filter: ComponentFilter) => {
    setEditingFilter(filter);
    setFormData({
      component_name: filter.component_name,
      filter_type: filter.filter_type,
      start_date: filter.start_date?.substring(0, 10) || "",
      end_date: filter.end_date?.substring(0, 10) || "",
    });
  };

  const handleSave = () => {
    if (!formData.component_name || !formData.filter_type) {
      toast({
        title: "Erro",
        description: "Componente e tipo de filtro são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (formData.filter_type === "custom_range" && (!formData.start_date || !formData.end_date)) {
      toast({
        title: "Erro",
        description: "Para período personalizado, as datas são obrigatórias",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  const getComponentLabel = (componentName: string) => {
    return COMPONENT_OPTIONS.find(opt => opt.value === componentName)?.label || componentName;
  };

  const getFilterTypeLabel = (filterType: string) => {
    return FILTER_TYPE_OPTIONS.find(opt => opt.value === filterType)?.label || filterType;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <h3 className="text-xl font-semibold text-white">Carregando configurações...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/ranking")}
              className="group flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-gray-300 group-hover:text-white transition-colors">
                Voltar ao Ranking
              </span>
            </button>

            <div className="text-right">
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-lg font-mono text-blue-400">
                {new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-xl">
                <Settings className="w-8 h-8" />
              </div>
            </div>

            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Configuração de Filtros
              </h1>
              <p className="text-gray-400 text-lg mt-1">
                Configure os períodos de exibição para cada componente
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Formulário */}
          <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">
                {editingFilter ? "Editar Filtro" : "Novo Filtro"}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="component" className="text-white">Componente</Label>
                <Select
                  value={formData.component_name}
                  onValueChange={(value) => setFormData({ ...formData, component_name: value })}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Selecione um componente" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {COMPONENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterType" className="text-white">Tipo de Filtro</Label>
                <Select
                  value={formData.filter_type}
                  onValueChange={(value) => setFormData({ ...formData, filter_type: value })}
                >
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Selecione o tipo de filtro" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {FILTER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.filter_type === "custom_range" && (
                <>
                  <div>
                    <Label htmlFor="startDate" className="text-white">Data Inicial</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="bg-gray-700/50 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate" className="text-white">Data Final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="bg-gray-700/50 border-gray-600 text-white"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>

                {editingFilter && (
                  <Button
                    onClick={() => {
                      setEditingFilter(null);
                      setFormData({
                        component_name: "",
                        filter_type: "",
                        start_date: "",
                        end_date: "",
                      });
                    }}
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-gray-700"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Lista de filtros */}
          <Card className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-gray-700/50">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Filtros Configurados</h2>
            </div>

            <div className="space-y-3">
              {filters?.map((filter) => (
                <div
                  key={filter.id}
                  className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/50 hover:border-gray-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">
                        {getComponentLabel(filter.component_name)}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {getFilterTypeLabel(filter.filter_type)}
                        {filter.filter_type === "custom_range" && filter.start_date && filter.end_date && (
                          <span className="ml-2">
                            ({new Date(filter.start_date).toLocaleDateString("pt-BR")} - {new Date(filter.end_date).toLocaleDateString("pt-BR")})
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleEdit(filter)}
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-white hover:bg-gray-700"
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              ))}

              {(!filters || filters.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Nenhum filtro configurado ainda</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}