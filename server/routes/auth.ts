
import { Request, Response } from "express";
import { supabase } from "../supabase";

export async function loginAuth(req: Request, res: Response) {
  try {
    const { password } = req.body;
    const companyId = (req as any).companyId;

    if (!password) {
      return res.status(400).json({ message: "Senha é obrigatória" });
    }

    if (!companyId) {
      return res.status(400).json({ message: "Company ID não encontrado" });
    }

    // Buscar configuração de autenticação da empresa
    const { data: authConfig, error } = await supabase
      .from("auth_system")
      .select("*")
      .eq("company_id", companyId)
      .eq("password", password)
      .single();

    if (error || !authConfig) {
      return res.status(401).json({ message: "Senha incorreta" });
    }

    // Verificar se não expirou
    const now = new Date();
    const expireAt = new Date(authConfig.expire_at);

    if (now > expireAt) {
      return res.status(401).json({ message: "Acesso expirado" });
    }

    res.json({
      success: true,
      expire_at: authConfig.expire_at,
      message: "Autenticação realizada com sucesso"
    });

  } catch (error) {
    console.error("Erro na autenticação:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}

export async function checkAuthStatus(req: Request, res: Response) {
  try {
    const companyId = (req as any).companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID não encontrado" });
    }

    // Buscar configuração de autenticação da empresa
    const { data: authConfig, error } = await supabase
      .from("auth_system")
      .select("expire_at")
      .eq("company_id", companyId)
      .single();

    if (error || !authConfig) {
      return res.status(404).json({ message: "Configuração de autenticação não encontrada" });
    }

    // Verificar se não expirou
    const now = new Date();
    const expireAt = new Date(authConfig.expire_at);

    res.json({
      expired: now > expireAt,
      expire_at: authConfig.expire_at
    });

  } catch (error) {
    console.error("Erro ao verificar status de autenticação:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}
