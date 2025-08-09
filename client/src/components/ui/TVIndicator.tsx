
import React from 'react';
import { useIsTVScreen, useScreenType } from '@/hooks/use-mobile';
import { Tv, Monitor } from 'lucide-react';

export function TVIndicator() {
  // Só exibe em desenvolvimento
  if (import.meta.env.PROD) {
    return null;
  }

  const isTVScreen = useIsTVScreen();
  const screenType = useScreenType();

  const getScreenInfo = () => {
    switch (screenType) {
      case 'mobile':
        return { label: 'Mobile', color: 'text-orange-400', icon: Monitor };
      case 'hd':
        return { label: 'HD 720p+', color: 'text-blue-400', icon: Monitor };
      case 'fhd':
        return { label: 'Full HD 1080p', color: 'text-green-400', icon: Tv };
      case 'qhd':
        return { label: 'QHD 1440p', color: 'text-purple-400', icon: Tv };
      case 'uhd':
        return { label: '4K UHD', color: 'text-yellow-400', icon: Tv };
      default:
        return { label: 'Desktop', color: 'text-blue-400', icon: Monitor };
    }
  };

  const screenInfo = getScreenInfo();
  const Icon = screenInfo.icon;

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg border border-white/20">
      <div className="flex items-center gap-2 text-sm">
        <Icon className={`w-4 h-4 ${screenInfo.color}`} />
        <span className={screenInfo.color}>{screenInfo.label}</span>
        <span className="text-gray-400">
          {window.innerWidth}×{window.innerHeight}
        </span>
      </div>
    </div>
  );
}
