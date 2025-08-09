import { useEffect, useState } from 'react';

interface ProgressBarProps {
  duration: number;
  onComplete?: () => void;
}

export function ProgressBar({ duration, onComplete }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    // Reset width to 0 then animate to 100%
    setWidth(0);
    
    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWidth(100);
      });
    });
    
    // Set up timer to call onComplete after duration
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onComplete]);
  
  return (
    <div className="progress-bar" style={{ width: `${width}%` }} />
  );
}
