import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const HD_BREAKPOINT = 1280; // HD 720p
const FHD_BREAKPOINT = 1920; // Full HD 1080p
const QHD_BREAKPOINT = 2560; // QHD 1440p
const UHD_BREAKPOINT = 3840; // 4K UHD

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsTVScreen() {
  const [isTVScreen, setIsTVScreen] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const checkTVScreen = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Detecta se é uma tela grande como TV (1920x1080 ou maior)
      const isLargeScreen = width >= FHD_BREAKPOINT || height >= 1080;
      const aspectRatio = width / height;
      const isTVAspectRatio = aspectRatio >= 1.6 && aspectRatio <= 1.9; // ~16:9

      // Para 4K e resoluções maiores
      const is4K = width >= UHD_BREAKPOINT || height >= 2160;

      setIsTVScreen(isLargeScreen || is4K);
    };

    checkTVScreen();
    window.addEventListener("resize", checkTVScreen);
    return () => window.removeEventListener("resize", checkTVScreen);
  }, []);

  return !!isTVScreen;
}

export function useScreenType() {
  const [screenType, setScreenType] = React.useState<'mobile' | 'hd' | 'fhd' | 'qhd' | 'uhd'>('mobile');

  React.useEffect(() => {
    const checkScreenType = () => {
      const width = window.innerWidth;

      if (width < MOBILE_BREAKPOINT) {
        setScreenType('mobile');
      } else if (width < FHD_BREAKPOINT) {
        setScreenType('hd');
      } else if (width < QHD_BREAKPOINT) {
        setScreenType('fhd');
      } else if (width < UHD_BREAKPOINT) {
        setScreenType('qhd');
      } else {
        setScreenType('uhd');
      }
    };

    checkScreenType();
    window.addEventListener("resize", checkScreenType);
    return () => window.removeEventListener("resize", checkScreenType);
  }, []);

  return screenType;
}
