
import { type Request, type Response } from "express";
import { supabase } from "../supabase";

export async function getRecentSales(req: Request, res: Response) {
  try {
    const companyId = (req as any).companyId;
    const { since } = req.query;

    console.log("Getting recent sales for company:", companyId, "since:", since);

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    if (!since) {
      return res.status(400).json({ message: "Since parameter is required" });
    }

    const { data, error } = await supabase
      .from("activities")
      .select(`
        id,
        lead_id,
        user_id,
        valor_novo,
        criado_em,
        brokers!inner(nome, cargo)
      `)
      .eq("tipo", "mudança_status")
      .eq("company_id", companyId)
      .eq("brokers.cargo", "Corretor")
      .gte("criado_em", since as string)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Error fetching recent sales:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    console.log(`Found ${data?.length || 0} recent sales activities`);
    res.json(data || []);
  } catch (error) {
    console.error("Error in getRecentSales:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
