import { getServerBaseUrl } from "@/lib/utils";
import { useState } from "react";

interface RecalculationState {
  isRecalculating: boolean;
  progress: number;
}

interface RecalculationActions {
  startRecalculation: () => Promise<void>;
  resetRecalculation: () => void;
}

interface BrokerPointsStatus {
  status: "processing" | "finished" | "error" | "waiting"; // Added "waiting" status
  progress?: number;
  is_calculating?: boolean; // Added is_calculating field
  completion_percentage?: number; // Added completion_percentage field for more precise progress
}

export function useRecalculation(): RecalculationState & RecalculationActions {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState(0);

  const checkBrokerPointsStatus = async (): Promise<BrokerPointsStatus> => {
    try {
      const response = await fetch(
        getServerBaseUrl() + "/api/broker-points-status",
      );
      if (!response.ok) {
        throw new Error("Failed to check broker points status");
      }
      return await response.json();
    } catch (error) {
      console.error("Error checking broker points status:", error);
      // Returning a default error state that includes is_calculating for consistent handling
      return { status: "error", is_calculating: false };
    }
  };

  const startRecalculation = async (): Promise<void> => {
    setIsRecalculating(true);
    setProgress(0);

    try {
      // Poll the status endpoint until calculation is finished
      const pollInterval = 1000; // Check every second
      const maxPollingTime = 300000; // Max 5 minutes
      const startTime = Date.now();

      const poll = async (): Promise<void> => {
        const status = await checkBrokerPointsStatus();

        // Check if calculation is truly finished (status = "finished" AND is_calculating = false)
        if (status.status === 'finished' && !status.is_calculating) {
          setProgress(100);
          // Small delay to show 100% completion
          await new Promise((resolve) => setTimeout(resolve, 500));
          setIsRecalculating(false);
          setProgress(0);
          return;
        }

        if (status.status === 'error') {
          console.error("Error in broker points calculation");
          setIsRecalculating(false);
          setProgress(0);
          return;
        }

        // Update progress based on completion_percentage from API
        if (status.completion_percentage !== undefined) {
          setProgress(Math.min(status.completion_percentage, 95));
        } else {
          // Fallback: simulate progress based on time elapsed
          const timeElapsed = Date.now() - startTime;
          const estimatedProgress = Math.min(
            (timeElapsed / maxPollingTime) * 90,
            90,
          );
          setProgress(estimatedProgress);
        }

        // Check if we've exceeded max polling time
        if (Date.now() - startTime >= maxPollingTime) {
          console.warn("Broker points calculation timed out");
          setIsRecalculating(false);
          setProgress(0);
          return;
        }

        // Continue polling if still calculating OR status is waiting
        if (status.is_calculating || status.status === "waiting") {
          setTimeout(poll, pollInterval);
        }
      };

      // Start polling
      await poll();
    } catch (error) {
      console.error("Error during recalculation process:", error);
      setIsRecalculating(false);
      setProgress(0);
    }
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