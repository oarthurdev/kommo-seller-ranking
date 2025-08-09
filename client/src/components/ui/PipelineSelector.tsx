
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Pipeline {
  id: number;
  name: string;
  description?: string;
}

interface PipelineConfig {
  pipeline_ids: number[];
  pipelines: Pipeline[];
  company_id: string;
}

interface PipelineSelectorProps {
  onPipelineChange: (pipelineId: number | null) => void;
  selectedPipelineId?: number | null;
  showAllOption?: boolean;
}

export function PipelineSelector({ 
  onPipelineChange, 
  selectedPipelineId, 
  showAllOption = true 
}: PipelineSelectorProps) {
  const { data: pipelineConfig, isLoading } = useQuery<PipelineConfig>({
    queryKey: ['/api/companies/pipeline-config'],
  });

  const handlePipelineChange = (value: string) => {
    if (value === 'all') {
      onPipelineChange(null);
    } else {
      onPipelineChange(parseInt(value));
    }
  };

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded"></div>;
  }

  if (!pipelineConfig || pipelineConfig.pipelines.length === 0) {
    return null;
  }

  // Se houver apenas um pipeline, não mostrar o seletor
  if (pipelineConfig.pipelines.length === 1 && !showAllOption) {
    return null;
  }

  return (
    <div className="w-full max-w-sm">
      <Select 
        value={selectedPipelineId ? selectedPipelineId.toString() : 'all'} 
        onValueChange={handlePipelineChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um funil" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">Todos os funis</SelectItem>
          )}
          {pipelineConfig.pipelines.map((pipeline) => (
            <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
              {pipeline.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PipelineOverview() {
  const { data: pipelineConfig, isLoading } = useQuery<PipelineConfig>({
    queryKey: ['/api/companies/pipeline-config'],
  });

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded"></div>;
  }

  if (!pipelineConfig || pipelineConfig.pipelines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum funil configurado</CardTitle>
          <CardDescription>
            Configure pelo menos um pipeline no Kommo para começar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pipelineConfig.pipelines.map((pipeline) => (
        <Card key={pipeline.id}>
          <CardHeader>
            <CardTitle className="text-lg">{pipeline.name}</CardTitle>
            {pipeline.description && (
              <CardDescription>{pipeline.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ID: {pipeline.id}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
