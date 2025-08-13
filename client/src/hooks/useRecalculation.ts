
import { useState } from 'react';

interface RecalculationState {
  isRecalculating: boolean;
  progress: number;
}

interface RecalculationActions {
  startRecalculation: () => Promise<void>;
  resetRecalculation: () => void;
}

export function useRecalculation(): RecalculationState & RecalculationActions {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState(0);

  const startRecalculation = async (): Promise<void> => {
    setIsRecalculating(true);
    setProgress(0);

    // Simular progresso do recálculo
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    // Aguardar tempo para o cálculo de pontos ser processado
    // Tempo ajustável baseado na performance do sistema
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Finalizar progresso
    setProgress(100);
    
    // Aguardar para mostrar 100% antes de continuar
    await new Promise(resolve => setTimeout(resolve, 500));

    // Limpar intervalo
    clearInterval(progressInterval);
    
    // Reset do estado
    setIsRecalculating(false);
    setProgress(0);
  };

  const resetRecalculation = (): void => {
    setIsRecalculating(false);
    setProgress(0);
  };

  return {
    isRecalculating,
    progress,
    startRecalculation,
    resetRecalculation,
  };
}
