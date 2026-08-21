import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request } from "express";

const JWT_SECRET = process.env.CLOUD_JWT_SECRET ?? "";
const JWT_EXPIRES_IN = (process.env.CLOUD_JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export interface CloudJwtPayload {
  userId: string;
  username: string;
}

export function assertCloudAuthConfigured() {
  if (!JWT_SECRET) {
    throw new Error("CLOUD_JWT_SECRET is not configured");
  }
}

export function createPinSalt() {
  return randomBytes(16).toString("hex");
}

export async function hashSecret(secret: string) {
  return bcrypt.hash(secret, 12);
}

export async function verifySecret(secret: string, hash: string) {
  return bcrypt.compare(secret, hash);
}

export function signCloudToken(payload: CloudJwtPayload) {
  assertCloudAuthConfigured();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyCloudToken(token: string): CloudJwtPayload {
  assertCloudAuthConfigured();
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid cloud token");
  }
  return decoded as CloudJwtPayload;
}

export function getBearerToken(req: Request) {
  const auth = req.headers["authorization"];
  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}
