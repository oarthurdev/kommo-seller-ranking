import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useCompanyBranding,
  type CompanyBranding,
} from "@/hooks/useCompanyBranding";

interface BrandingContextType {
  branding: CompanyBranding | null;
  isLoading: boolean;
  applyBranding: (branding: CompanyBranding) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(
  undefined,
);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: branding, isLoading } = useCompanyBranding();
  const [appliedBranding, setAppliedBranding] =
    useState<CompanyBranding | null>(null);

  const applyBranding = (brandingData: CompanyBranding) => {
    console.log("Applying branding data:", brandingData);
    const root = document.documentElement;

    // Apply CSS custom properties with HSL conversion
    if (brandingData.primary_color) {
      const hsl = hexToHsl(brandingData.primary_color);
      const hexColor = brandingData.primary_color;
      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--primary-hex", hexColor);
      root.style.setProperty(
        "--primary-foreground",
        getContrastColor(hexColor),
      );

      // Apply to gradients and custom elements
      root.style.setProperty(
        "--gradient-primary",
        `linear-gradient(135deg, ${hexColor}, ${adjustBrightness(hexColor, -20)})`,
      );
      root.style.setProperty(
        "--primary-hover",
        adjustBrightness(hexColor, -10),
      );

      console.log("Applied primary color:", hexColor, "as HSL:", hsl);
    }

    if (brandingData.secondary_color) {
      const hsl = hexToHsl(brandingData.secondary_color);
      const hexColor = brandingData.secondary_color;
      root.style.setProperty("--secondary", hsl);
      root.style.setProperty("--secondary-hex", hexColor);
      root.style.setProperty(
        "--secondary-foreground",
        getContrastColor(hexColor),
      );
      root.style.setProperty(
        "--secondary-hover",
        adjustBrightness(hexColor, -10),
      );

      console.log("Applied secondary color:", hexColor, "as HSL:", hsl);
    }

    if (brandingData.accent_color) {
      const hsl = hexToHsl(brandingData.accent_color);
      const hexColor = brandingData.accent_color;
      root.style.setProperty("--accent", hsl);
      root.style.setProperty("--accent-hex", hexColor);
      root.style.setProperty("--accent-foreground", getContrastColor(hexColor));
      root.style.setProperty("--accent-hover", adjustBrightness(hexColor, -10));

      console.log("Applied accent color:", hexColor, "as HSL:", hsl);
    }

    // Apply theme mode
    if (brandingData.theme_mode) {
      root.classList.remove("light", "dark");
      root.classList.add(brandingData.theme_mode);
      console.log("Applied theme mode:", brandingData.theme_mode);
    }

    // Update favicon
    if (brandingData.favicon_url) {
      let favicon = document.querySelector(
        'link[rel="icon"]',
      ) as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = brandingData.favicon_url;
      console.log("Applied favicon:", brandingData.favicon_url);
    }

    // Update document title
    if (brandingData.dashboard_title) {
      document.title = brandingData.dashboard_title;
      console.log("Applied title:", brandingData.dashboard_title);
    }

    setAppliedBranding(brandingData);
  };

  useEffect(() => {
    console.log("BrandingContext useEffect:", { branding, isLoading });
    if (branding && !isLoading) {
      console.log("Applying branding:", branding);
      applyBranding(branding);
    }
  }, [branding, isLoading]);

  return (
    <BrandingContext.Provider
      value={{
        branding: appliedBranding,
        isLoading,
        applyBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}

// Helper function to convert hex to HSL format expected by CSS variables
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${h} ${s}% ${lightness}%`;
}

// Helper function to get contrast color for text
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// Helper function to adjust brightness
function adjustBrightness(hexColor: string, percent: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const adjust = (color: number) => {
    const adjusted = Math.round((color * (100 + percent)) / 100);
    return Math.max(0, Math.min(255, adjusted));
  };

  const newR = adjust(r).toString(16).padStart(2, "0");
  const newG = adjust(g).toString(16).padStart(2, "0");
  const newB = adjust(b).toString(16).padStart(2, "0");

  return `#${newR}${newG}${newB}`;
}
