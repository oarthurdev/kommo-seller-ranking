import { type Request, type Response } from "express";
import { supabase } from "../supabase";

export async function getRecentSales(req: Request, res: Response) {
  try {
    const companyId = (req as any).companyId as string | undefined;
    const { since } = req.query as { since?: string };

    console.log(
      "Getting recent sales for company:",
      companyId,
      "since:",
      since,
    );

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    if (!since) {
      return res.status(400).json({ message: "Since parameter is required" });
    }

    // 1) Buscar apenas as activities (sem relação)
    const { data: activities, error: activitiesError } = await supabase
      .from("activities")
      .select("id, lead_id, user_id, valor_novo, criado_em, tipo, company_id")
      .eq("tipo", "mudança_status")
      .eq("company_id", companyId)
      .gte("criado_em", since)
      .order("criado_em", { ascending: false });

    if (activitiesError) {
      console.error(
        "Error fetching recent sales (activities):",
        activitiesError,
      );
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!activities || activities.length === 0) {
      console.log("Found 0 recent sales activities");
      return res.json([]);
    }

    // 2) Coletar user_ids distintos
    const userIds = Array.from(
      new Set(activities.map((a) => a.user_id).filter(Boolean)),
    );

    if (userIds.length === 0) {
      console.log("No user_ids in activities");
      return res.json([]); // sem responsáveis, nada pra retornar dentro do critério de corretor
    }

    // 3) Buscar brokers correspondentes (já filtrando por cargo = Corretor)
    const { data: brokers, error: brokersError } = await supabase
      .from("brokers")
      .select("id, nome, cargo")
      .in("id", userIds)
      .eq("cargo", "Corretor");

    if (brokersError) {
      console.error("Error fetching brokers:", brokersError);
      return res.status(500).json({ message: "Internal server error" });
    }

    // Index rápido por id para merge O(1)
    const brokerById = new Map((brokers || []).map((b) => [b.id, b]));

    // 4) Merge mantendo a ordem original + 5) formato compatível
    const merged = activities
      .map((a) => {
        const b = brokerById.get(a.user_id);
        if (!b) return null; // filtra aqui quem não é "Corretor" ou não tem broker
        return {
          id: a.id,
          lead_id: a.lead_id,
          user_id: a.user_id,
          valor_novo: a.valor_novo,
          criado_em: a.criado_em,
          // replicando o shape que você recebia do select com relação:
          brokers: {
            nome: b.nome,
            cargo: b.cargo,
          },
        };
      })
      .filter(Boolean);

    console.log(
      `Found ${merged.length} recent sales activities (filtered by broker=cO rretor)`,
    );
    return res.json(merged);
  } catch (error) {
    console.error("Error in getRecentSales:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
