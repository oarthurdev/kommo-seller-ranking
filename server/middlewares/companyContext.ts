import { type Request, type Response, type NextFunction } from "express";
import { supabase } from "../supabase";

export async function companyContext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const host = req.headers.host || "";
  const subdomain = host.split(".")[0]; // 'dicasaindaial' de 'dicasaindaial.imobiliario.tec.br'

  console.log("Host header:", req.headers.host);
  console.log(
    "URL completa:",
    req.protocol + "://" + req.headers.host + req.originalUrl,
  );

  console.log("Subdomain: ", subdomain);

  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    console.log("Empresa encontrada: ", data);

    if (error || !data) {
      // Set a flag to indicate this is an error response
      (req as any).companyNotFound = true;
      (req as any).subdomain = subdomain;

      // Continue to next() so the React app can handle the error
      next();
      return;
    }

    // Armazena o ID da empresa na requisição
    (req as any).companyId = data.id;

    // (req as any).companyId = "4f114478-6405-4971-9344-01f647c6edb8";
    // (req as any).subdomain = "dicasa";

    next();
  } catch (err) {
    next(err);
  }
}
