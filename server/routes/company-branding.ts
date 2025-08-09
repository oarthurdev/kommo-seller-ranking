import { type Request, type Response } from "express";
import { supabase } from "../supabase";

export async function getCompanyBranding(req: Request, res: Response) {
  try {
    const companyId = (req as any).companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const { data, error } = await supabase
      .from("company_branding")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Error fetching company branding:", error.message);
      return res.status(500).json({ message: "Internal server error" });
    }

    // If no branding found, return default values
    if (!data) {
      return res.json({
        company_id: companyId,
        primary_color: "#0ea5e9", // Default blue
        secondary_color: "#64748b", // Default slate
        accent_color: "#10b981", // Default emerald
        theme_mode: "light",
        dashboard_title: "Dashboard Imobiliário",
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Error in getCompanyBranding:", error instanceof Error ? error.message : "Unknown error");
    if (!res.headersSent) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export async function updateCompanyBranding(req: Request, res: Response) {
  try {
    const companyId = (req as any).companyId;
    const brandingData = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const { data, error } = await supabase
      .from("company_branding")
      .upsert({
        company_id: companyId,
        ...brandingData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating company branding:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error in updateCompanyBranding:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
