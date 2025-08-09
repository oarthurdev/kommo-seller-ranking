
import React, { useState, useEffect } from 'react';
import { Monitor, Tv, Smartphone, Tablet } from 'lucide-react';

interface TVSimulatorProps {
  children: React.ReactNode;
}

const presets = {
  mobile: { width: 375, height: 667, name: 'Mobile', icon: Smartphone },
  tablet: { width: 1024, height: 768, name: 'Tablet', icon: Tablet },
  hd720p: { width: 1280, height: 720, name: 'HD 720p', icon: Monitor },
  desktop: { width: 1920, height: 1080, name: 'Desktop FHD', icon: Monitor },
  tv1080p: { width: 1920, height: 1080, name: 'TV 1080p', icon: Tv },
  qhd1440p: { width: 2560, height: 1440, name: 'QHD 1440p', icon: Tv },
  tv4k: { width: 3840, height: 2160, name: 'TV 4K UHD', icon: Tv },
  tv8k: { width: 7680, height: 4320, name: 'TV 8K', icon: Tv },
};

export function TVSimulator({ children }: TVSimulatorProps) {
  // Só exibe em desenvolvimento
  if (import.meta.env.PROD) {
    return <>{children}</>;
  }

  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPreset, setCurrentPreset] = useState('tv4k');
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    if (isSimulating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isSimulating]);

  if (!isSimulating) {
    return (
      <div className="relative">
        {children}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsSimulating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
          >
            <Tv className="w-4 h-4" />
            Simular TV
          </button>
        </div>
      </div>
    );
  }

  const preset = presets[currentPreset as keyof typeof presets];

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-auto">
      {/* Controles do Simulador */}
      <div className="absolute top-4 left-4 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-semibold">Simulador de TV/Monitor</h3>
            <div className="flex items-center gap-2">
              {Object.entries(presets).map(([key, preset]) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setCurrentPreset(key)}
                    className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors ${
                      currentPreset === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm">Zoom:</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-white text-sm w-12">{Math.round(scale * 100)}%</span>
            </div>

            <div className="text-white text-sm">
              {preset.width} × {preset.height}
            </div>

            <button
              onClick={() => setIsSimulating(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Viewport Simulado */}
      <div className="flex items-center justify-center min-h-screen pt-20 pb-8">
        <div
          className="bg-white border-4 border-gray-800 rounded-lg overflow-hidden shadow-2xl"
          style={{
            width: preset.width * scale,
            height: preset.height * scale,
          }}
        >
          <div
            className="origin-top-left"
            style={{
              width: preset.width,
              height: preset.height,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
