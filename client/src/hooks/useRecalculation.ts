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
  status: "processing" | "finished" | "error";
  progress?: number;
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
      return { status: "error" };
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

        if (status.status === "finished") {
          setProgress(100);
          // Small delay to show 100% completion
          await new Promise((resolve) => setTimeout(resolve, 500));
          setIsRecalculating(false);
          setProgress(0);
          return;
        }

        if (status.status === "error") {
          console.error("Error in broker points calculation");
          setIsRecalculating(false);
          setProgress(0);
          return;
        }

        // Update progress if available, otherwise simulate based on time elapsed
        if (status.progress !== undefined) {
          setProgress(Math.min(status.progress, 95));
        } else {
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

        // Continue polling if still processing
        if (status.status === "processing") {
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
