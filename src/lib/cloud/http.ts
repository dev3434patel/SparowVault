import type { Request, Response } from "express";
import { getBearerToken, verifyCloudToken } from "@/lib/cloud/auth";

export function jsonError(res: Response, message: string, status = 400) {
  return res.status(status).json({ ok: false, error: message });
}

export function jsonOk<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function requireCloudUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) throw new Error("Missing bearer token");
  return verifyCloudToken(token);
}
