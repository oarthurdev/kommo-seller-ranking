
import { Request, Response } from "express";

export function getCompanyStatus(req: Request, res: Response) {
  // Check if company was not found in companyContext middleware
  if ((req as any).companyNotFound) {
    return res.status(404).json({
      error: "Company not found",
      subdomain: (req as any).subdomain,
    });
  }

  // Company exists, return success with company ID
  return res.status(200).json({
    companyId: (req as any).companyId,
    subdomain: (req as any).subdomain,
  });
}
